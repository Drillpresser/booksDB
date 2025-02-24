// Description: This file contains the JavaScript code for the authentication modal.

// Import the functions needed for Firebase auth and Firestore.
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Load the modal and set the variables needed for the modal.
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

    // Identify the signup button and set up the email and password fields for the profile.
    const signUpButton = document.getElementById("signup-button");
    signUpButton.onclick = async () => {
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
    
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user profile information in Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                createdAt: new Date()
            });
            console.log("User signed up and profile created:", user);
            messageContainer.textContent = "Sign-up successful! Welcome, " + user.email;
            messageContainer.style.color = "green";
            authModal.style.display = "none"; // Close the modal after successful sign-up
        } catch (error) {
            console.error("Signup error:", error.message);
            messageContainer.textContent = "Sign-up failed: " + error.message;
            messageContainer.style.color = "red";
        }
    }
}

// Load the modal when the page loads
window.onload = loadModal;