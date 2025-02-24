async function loadModal() {
    const response = await fetch('auth-modal.html');
    const modalHTML = await response.text();
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get the modal
    const authModal = document.getElementById("auth-modal");

    // Get the button that opens the modal
    const modalOpen = document.getElementById("auth-modal-btn");

    // Get the <span> element that closes the modal
    const modalClose = document.getElementsByClassName("close-button")[0];

    // When the user clicks the button, open the modal
    modalOpen.onclick = function() {
        authModal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    modalClose.onclick = function() {
        authModal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == authModal) {
            authModal.style.display = "none";
        }
    }
}

// Load the modal when the page loads
window.onload = loadModal;