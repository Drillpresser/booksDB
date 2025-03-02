// Description: This file contains the JavaScript code for the authentication modal.
const modalContainer = document.getElementById('auth-modal-container');
const triggerButton = document.getElementById('auth-modal-btn');

// Load modal HTML and initialize
function initAuthModal() {
    fetch('auth-modal/auth-modal.html')
        .then(response => response.text())
        .then(html => {
            modalContainer.innerHTML = html;
            addEventListeners();
        });
}

// Event Listeners
function addEventListeners() {
    // Close modal
    modalContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || 
            e.target.classList.contains('close-button')) {
            closeModal();
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Add click handler to the trigger button
    triggerButton.addEventListener('click', openModal);
}

// Modal functions
function openModal() {
    modalContainer.querySelector('.auth-modal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeModal() {
    modalContainer.querySelector('.auth-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initAuthModal();
});