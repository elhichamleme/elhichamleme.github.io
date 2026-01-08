// =================================================================
// Data Transfer - Category-Based Web Client with Pagination
// =================================================================

// Firebase Integration
// Access Firebase services globally (initialized in firebase-config.js)
const firebaseAnalytics = window.analytics;
const firebaseDB = window.db;
const firebaseStorage = window.storage;

// Application State
const state = {
    sessionID: null,
    isVerified: false,
    manifest: null,
    currentCategory: null,
    categories: {},
    downloadQueue: []
};

// Configuration
const CONFIG = {
    ITEMS_PER_PAGE: 10,
    MAX_PARALLEL_DOWNLOADS: 3
};

// =================================================================
// Code Verification
// =================================================================

const codeVerification = {
    init() {
        const inputs = document.querySelectorAll('.code-input');
        const verifyBtn = document.getElementById('verifyCodeBtn');
        const codeError = document.getElementById('codeError');

        // Auto-focus next input
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;

                // Only allow numbers
                if (!/^\d*$/.test(value)) {
                    e.target.value = '';
                    return;
                }

                // Move to next input if not the last one
                if (value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }

                // Hide error when user starts typing
                codeError.style.display = 'none';
            });

            // Handle backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            // Handle paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').trim();

                if (/^\d{4}$/.test(pastedData)) {
                    inputs.forEach((inp, i) => {
                        inp.value = pastedData[i];
                    });
                    inputs[3].focus();
                }
            });
        });

        // Verify code on button click
        verifyBtn.addEventListener('click', () => this.verifyCode());

        // Verify on Enter key
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyCode();
                }
            });
        });

        // Focus first input
        inputs[0].focus();
    },

    async verifyCode() {
        const inputs = document.querySelectorAll('.code-input');
        const code = Array.from(inputs).map(input => input.value).join('');
        const verifyBtn = document.getElementById('verifyCodeBtn');
        const codeError = document.getElementById('codeError');

        if (code.length !== 4) {
            this.showError('Please enter all 4 digits');
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
            const response = await fetch('/api/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (data.success && data.sessionID) {
                state.sessionID = data.sessionID;
                state.isVerified = true;

                // Store session ID
                localStorage.setItem('sessionID', data.sessionID);

                // Track code verification success in Firebase Analytics
                if (firebaseAnalytics) {
                    firebaseAnalytics.logEvent('code_verified', {
                        session_id: data.sessionID
                    });
                }

                // Hide modal and show main content with options
                const modal = document.getElementById('codeModal');
                const mainContent = document.getElementById('mainContent');

                modal.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    modal.style.display = 'none';
                    mainContent.style.display = 'block';
                    // Show options section (not categories)
                    document.getElementById('optionsSection').style.display = 'grid';
                    document.getElementById('categoriesSection').style.display = 'none';
                    document.getElementById('filesSection').style.display = 'none';
                }, 300);

            } else {
                this.showError(data.error || 'Invalid code. Please try again.');
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
            }
        } catch (error) {
            console.error('Code verification error:', error);
            this.showError('Connection error. Please try again.');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify Code';
        }
    },

    showError(message) {
        const codeError = document.getElementById('codeError');
        codeError.textContent = message;
        codeError.style.display = 'block';
    }
};

// =================================================================
// Manifest Manager
// =================================================================

const manifestManager = {
    async loadManifest() {
        if (!state.sessionID) {
            console.error('No session ID');
            return;
        }

        try {
            const response = await fetch('/manifest', {
                headers: { 'X-Session-ID': state.sessionID }
            });

            if (!response.ok) {
                throw new Error('Failed to load manifest');
            }

            const data = await response.json();
            state.manifest = data;

            // Display categories
            this.displayCategories(data.categories);

        } catch (error) {
            console.error('Manifest error:', error);
            alert('Failed to load transfer data. Please try again.');
        }
    },

    displayCategories(categories) {
        const categoriesSection = document.getElementById('categoriesSection');
        const categoriesGrid = document.getElementById('categoriesGrid');

        if (!categories || categories.length === 0) {
            categoriesSection.style.display = 'none';
            return;
        }

        categoriesSection.style.display = 'block';
        categoriesGrid.innerHTML = '';

        const icons = {
            photos: '📷',
            videos: '🎥',
            contacts: '👥',
            calendars: '📅',
            files: '📁'
        };

        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.onclick = () => categoryBrowser.loadCategory(category);

            const icon = icons[category.type] || '📄';
            const sizeText = this.formatBytes(category.sizeBytes);

            card.innerHTML = `
                <div class="category-icon">${icon}</div>
                <div class="category-name">${category.type}</div>
                <div class="category-count">${category.count} items</div>
                <div class="category-size">${sizeText}</div>
            `;

            categoriesGrid.appendChild(card);
        });
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
};

// =================================================================
// Category Browser with Pagination
// =================================================================

const categoryBrowser = {
    currentPage: 1,
    itemsPerPage: CONFIG.ITEMS_PER_PAGE,

    async loadCategory(category) {
        state.currentCategory = category;
        this.currentPage = 1;

        // Track category view in Firebase Analytics
        if (firebaseAnalytics) {
            firebaseAnalytics.logEvent('category_viewed', {
                category_type: category.type,
                category_id: category.id,
                item_count: category.count
            });
        }

        const filesSection = document.getElementById('filesSection');
        const categoryTitle = document.getElementById('categoryTitle');
        const filesList = document.getElementById('filesList');
        const pagination = document.getElementById('pagination');

        filesSection.style.display = 'block';
        filesSection.scrollIntoView({ behavior: 'smooth' });

        const icon = {
            photos: '📷',
            videos: '🎥',
            contacts: '👥',
            calendars: '📅',
            files: '📁'
        }[category.type] || '📄';

        categoryTitle.innerHTML = `${icon} ${category.type.charAt(0).toUpperCase() + category.type.slice(1)}`;

        try {
            const response = await fetch(`/data/${category.id}`, {
                headers: { 'X-Session-ID': state.sessionID }
            });

            if (!response.ok) {
                throw new Error('Failed to load category');
            }

            const data = await response.json();
            state.categories[category.id] = data;

            this.displayFiles(data.files);

        } catch (error) {
            console.error('Category load error:', error);
            filesList.innerHTML = '<p style="color: #ef4444; padding: 16px;">Failed to load files. Please try again.</p>';
        }
    },

    displayFiles(allFiles) {
        const filesList = document.getElementById('filesList');
        const pagination = document.getElementById('pagination');

        if (!allFiles || allFiles.length === 0) {
            filesList.innerHTML = '<p style="color: #666; padding: 16px;">No files in this category.</p>';
            pagination.style.display = 'none';
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(allFiles.length / this.itemsPerPage);
        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const filesOnPage = allFiles.slice(startIdx, endIdx);

        // Display files on current page
        filesList.innerHTML = '';
        filesOnPage.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${this.getFileIcon(file.name)}</div>
                    <div>
                        <div class="file-name">${this.escapeHtml(file.name)}</div>
                        <div class="file-size">${manifestManager.formatBytes(file.size)}</div>
                    </div>
                </div>
                <button class="download-file-btn" onclick="categoryBrowser.downloadFile('${this.escapeHtml(file.url)}', '${this.escapeHtml(file.name)}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                </button>
            `;

            filesList.appendChild(fileItem);
        });

        // Update pagination
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            pagination.innerHTML = `
                <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="categoryBrowser.changePage(${this.currentPage - 1})">
                    Previous
                </button>
                <span class="pagination-info">Page ${this.currentPage} of ${totalPages}</span>
                <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="categoryBrowser.changePage(${this.currentPage + 1})">
                    Next
                </button>
            `;
        } else {
            pagination.style.display = 'none';
        }
    },

    changePage(newPage) {
        this.currentPage = newPage;
        const category = state.currentCategory;
        const data = state.categories[category.id];
        this.displayFiles(data.files);
        document.getElementById('filesSection').scrollIntoView({ behavior: 'smooth' });
    },

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', heic: '🖼️',
            mp4: '🎬', mov: '🎬', avi: '🎬',
            vcf: '👤',
            ics: '📅',
            pdf: '📄', doc: '📄', docx: '📄', txt: '📄'
        };
        return icons[ext] || '📄';
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async downloadFile(url, filename) {
        try {
            const response = await fetch(url, {
                headers: { 'X-Session-ID': state.sessionID }
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            console.log(`Downloaded: ${filename}`);

            // Track file download in Firebase Analytics
            if (firebaseAnalytics) {
                firebaseAnalytics.logEvent('file_downloaded', {
                    file_name: filename,
                    file_size: blob.size,
                    category: state.currentCategory?.type || 'unknown'
                });
            }

        } catch (error) {
            console.error('Download error:', error);
            alert(`Failed to download ${filename}. Please try again.`);
        }
    },

    showProgressModal(total) {
        const modal = document.createElement('div');
        modal.className = 'progress-modal';
        modal.innerHTML = `
            <div class="progress-modal-content">
                <h3>Downloading Files...</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
                <p class="progress-text">Preparing...</p>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    },

    updateProgress(modal, current, total, filename) {
        const percent = (current / total) * 100;
        const progressFill = modal.querySelector('.progress-bar-fill');
        const progressText = modal.querySelector('.progress-text');

        progressFill.style.width = percent + '%';
        progressText.textContent = `${current} of ${total}: ${filename}`;
    },

    hideProgressModal(modal) {
        setTimeout(() => {
            modal.remove();
        }, 1000);
    }
};

// =================================================================
// Navigation Functions
// =================================================================

async function downloadAndroidApp() {
    try {
        // Track Android app download initiation
        if (firebaseAnalytics) {
            firebaseAnalytics.logEvent('android_app_download_initiated');
        }

        console.log('📡 Fetching config from local server...');

        // Fetch config from local server (works offline)
        const response = await fetch('/config');

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const config = await response.json();
        console.log('✅ Config loaded:', JSON.stringify(config, null, 2));

        const androidClient = config['android-client'] || 'apk';
        console.log('📱 Android client value:', androidClient);
        console.log('📱 Android client type:', typeof androidClient);
        console.log('📱 Android client lowercase:', androidClient.toLowerCase());
        console.log('📱 Comparison result (=== "apk"):', androidClient.toLowerCase() === 'apk');

        if (androidClient.toLowerCase() === 'apk') {
            // Show APK installation page with instructions
            console.log('✅ Condition matched! Redirecting to APK installation page');
            window.location.href = '/apk-install';
        } else {
            // Redirect to the specified URL (Play Store or other)
            console.log('❌ Condition not matched. Redirecting to URL:', androidClient);
            window.location.href = androidClient;
        }
    } catch (error) {
        console.error('❌ Failed to fetch config:', error);
        // Fallback to APK installation page on error
        console.log('⬇️ Falling back to APK installation page');
        window.location.href = '/apk-install';
    }
}

function showWebBrowser() {
    document.getElementById('optionsSection').style.display = 'none';
    document.getElementById('categoriesSection').style.display = 'block';

    // Load manifest if not already loaded
    if (!state.manifest) {
        manifestManager.loadManifest();
    }
}

function showOptions() {
    document.getElementById('categoriesSection').style.display = 'none';
    document.getElementById('filesSection').style.display = 'none';
    document.getElementById('optionsSection').style.display = 'grid';
}

function backToCategories() {
    document.getElementById('filesSection').style.display = 'none';
    document.getElementById('categoriesSection').style.display = 'block';
}

// =================================================================
// Application Initialization
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Data Transfer - Web Client Starting...');

    // Clear any old session (new server = new code)
    localStorage.removeItem('sessionID');
    state.sessionID = null;
    state.isVerified = false;

    // Always show code modal on fresh load
    document.getElementById('codeModal').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';

    // Initialize code verification
    codeVerification.init();

    // Track app initialization in Firebase Analytics
    if (firebaseAnalytics) {
        firebaseAnalytics.logEvent('app_initialized', {
            timestamp: new Date().toISOString()
        });
    }

    console.log('✅ Application ready!');
});
