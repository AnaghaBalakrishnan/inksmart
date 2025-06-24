// DOM Elements
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const preview = document.getElementById('preview');
const previewSection = document.getElementById('preview-section');
const removePreview = document.getElementById('remove-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const uploadForm = document.getElementById('upload-form');
const resultSection = document.getElementById('result-section');
const beforeImg = document.getElementById('before-img');
const resultImg = document.getElementById('result-img');
const downloadBtn = document.getElementById('download-btn');
const processBtn = document.getElementById('process-btn');
const btnText = processBtn.querySelector('.btn-text');
const btnLoader = processBtn.querySelector('.btn-loader');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const processAnother = document.getElementById('process-another');

// Text extraction elements
const extractTextCheck = document.getElementById('extract-text-check');
const textResultSection = document.getElementById('text-result-section');
const extractedText = document.getElementById('extracted-text');
const confidenceScore = document.getElementById('confidence-score');
const copyTextBtn = document.getElementById('copy-text-btn');

// Initialize particles animation
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 2-6px
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Random position
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    // Random animation delay and duration
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 4) + 's';
    
    container.appendChild(particle);
}

// File handling utilities
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
        showError('Please select a valid image file (PNG, JPG, JPEG, GIF, WebP)');
        return false;
    }
    
    if (file.size > maxSize) {
        showError('File size must be less than 10MB');
        return false;
    }
    
    return true;
}

// UI State Management
function showPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        previewSection.classList.remove('d-none');
        uploadArea.style.display = 'none';
        hideError();
        hideResult();
        hideTextResult();
    };
    reader.readAsDataURL(file);
}

function hidePreview() {
    previewSection.classList.add('d-none');
    uploadArea.style.display = 'block';
    preview.src = '#';
    fileName.textContent = '';
    fileSize.textContent = '';
    fileInput.value = '';
}

function showResult(originalImageSrc, processedBlob) {
    const processedUrl = URL.createObjectURL(processedBlob);
    
    beforeImg.src = originalImageSrc;
    resultImg.src = processedUrl;
    
    // Show result section
    resultSection.classList.remove('d-none');
    previewSection.classList.add('d-none');
    
    // Add download button
    downloadBtn.href = processedUrl;
    downloadBtn.download = fileName.textContent || 'signature_no_bg.png';
    downloadBtn.classList.remove('d-none');
}

function hideResult() {
    resultSection.classList.add('d-none');
    beforeImg.src = '#';
    resultImg.src = '#';
    downloadBtn.href = '#';
    downloadBtn.classList.add('d-none');
}

function showTextResult(textData) {
    console.log('Showing text result:', textData);
    if (textData.success && textData.text.trim()) {
        extractedText.textContent = textData.text;
        confidenceScore.textContent = Math.round(textData.total_confidence * 100) + '%';
        textResultSection.classList.remove('d-none');
        console.log('Text result displayed successfully');
    } else {
        console.log('No text found or extraction failed');
        hideTextResult();
    }
}

function hideTextResult() {
    textResultSection.classList.add('d-none');
    extractedText.textContent = '';
    confidenceScore.textContent = '0%';
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorSection.classList.remove('d-none');
}

function hideError() {
    errorSection.classList.add('d-none');
    errorMessage.textContent = '';
}

function setProcessing(isProcessing) {
    if (isProcessing) {
        btnText.classList.add('d-none');
        btnLoader.classList.remove('d-none');
        processBtn.disabled = true;
    } else {
        btnText.classList.remove('d-none');
        btnLoader.classList.add('d-none');
        processBtn.disabled = false;
    }
}

// Drag & Drop and Click-to-Browse
function handleUploadAreaClick() {
    fileInput.click();
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileInputChange(e) {
    if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
}

function handleFile(file) {
    hideError();
    if (!isValidImageFile(file)) return;
    showPreview(file);
    // Save the file for later submission
    fileInput._selectedFile = file;
}

function removePreviewImage() {
    hidePreview();
    hideError();
}

function processAnotherImage() {
    hideResult();
    hidePreview();
    hideError();
    hideTextResult();
    extractTextCheck.checked = false;
}

// Form Submission
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideError();
    setProcessing(true);
    let file = fileInput._selectedFile || fileInput.files[0];
    if (!file) {
        setProcessing(false);
        showError('Please select an image file to process.');
        return;
    }
    if (!isValidImageFile(file)) {
        setProcessing(false);
        return;
    }
    // Get the preview image src for "before"
    const originalImageSrc = preview.src;
    const formData = new FormData();
    formData.append('file', file);
    try {
        console.log('Starting background removal...');
        // First, remove background
        const response = await fetch('/remove-bg/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to process image.');
        const blob = await response.blob();
        showResult(originalImageSrc, blob);
        console.log('Background removal completed');
        
        // If text extraction is enabled, extract text from the processed image
        if (extractTextCheck.checked) {
            console.log('Text extraction is enabled, starting extraction...');
            const textResult = await extractTextFromImage(blob);
            showTextResult(textResult);
        } else {
            console.log('Text extraction is disabled');
            hideTextResult();
        }
        
    } catch (err) {
        console.error('Processing error:', err);
        showError(err.message || 'An error occurred.');
    } finally {
        setProcessing(false);
    }
});

// Event Listeners
uploadArea.addEventListener('click', handleUploadAreaClick);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileInputChange);
removePreview.addEventListener('click', removePreviewImage);
processAnother.addEventListener('click', processAnotherImage);
copyTextBtn.addEventListener('click', copyTextToClipboard);

// Initialize
initParticles();

// Text extraction functionality
async function extractTextFromImage(imageBlob) {
    try {
        console.log('Starting text extraction...');
        const formData = new FormData();
        formData.append('file', imageBlob);
        
        const response = await fetch('/extract-text/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to extract text.');
        
        const result = await response.json();
        console.log('Text extraction result:', result);
        return result;
    } catch (err) {
        console.error('Text extraction error:', err);
        return {
            success: false,
            error: err.message,
            text: '',
            words: [],
            total_confidence: 0.0
        };
    }
}

// Copy text to clipboard
async function copyTextToClipboard() {
    const text = extractedText.textContent;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show success feedback
        const originalText = copyTextBtn.innerHTML;
        copyTextBtn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        copyTextBtn.style.background = 'var(--success-gradient)';
        
        setTimeout(() => {
            copyTextBtn.innerHTML = originalText;
            copyTextBtn.style.background = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        showError('Failed to copy text to clipboard');
    }
}