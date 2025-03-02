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