// Function to fetch book data from Open Library
async function fetchBooks(query) {
    const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.docs || [];
    } catch (error) {
      console.error("Error fetching book data:", error);
      return [];
    }
  }
  
  // Function to display search results in cards
  function displayResults(books) {
    const container = document.getElementById("results-container");
    container.innerHTML = ""; // Clear previous results
  
    if (books.length === 0) {
      container.innerHTML = "<p>No results found.</p>";
      return;
    }
  
    books.forEach(book => {
      const card = document.createElement("div");
      card.className = "result-card";
  
      // Cover Image: Use cover_i if available, else a placeholder
      const img = document.createElement("img");
      if (book.cover_i) {
        img.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
        img.alt = `Cover image for ${book.title}`;
      } else {
        img.src = "https://via.placeholder.com/300x400?text=No+Cover";
        img.alt = "No cover available";
      }
      card.appendChild(img);
  
      // Title
      const title = document.createElement("h3");
      title.textContent = book.title || "No Title Available";
      card.appendChild(title);
  
      // Author(s)
      if (book.author_name && book.author_name.length > 0) {
        const author = document.createElement("p");
        author.textContent = "Author: " + book.author_name.join(", ");
        card.appendChild(author);
      }
  
      // Publication Year
      if (book.first_publish_year) {
        const year = document.createElement("p");
        year.textContent = "First Published: " + book.first_publish_year;
        card.appendChild(year);
      }
  
      container.appendChild(card);
    });
  }
  
  // Event listeners for search functionality
  document.getElementById("search-button").addEventListener("click", async () => {
    const query = document.getElementById("search-input").value.trim();
    if (!query) return;
    const books = await fetchBooks(query);
    displayResults(books);
  });
  
  document.getElementById("search-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      document.getElementById("search-button").click();
    }
  });
  

  import { saveBook } from "./auth.js";
import { auth } from "./firebase-config.js";

function displayResults(books) {
  const container = document.getElementById("results-container");
  container.innerHTML = "";

  books.forEach(book => {
    const card = document.createElement("div");
    card.className = "result-card";

    const img = document.createElement("img");
    img.src = book.cover_i 
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` 
      : "https://via.placeholder.com/100x150?text=No+Cover";
    card.appendChild(img);

    const title = document.createElement("h3");
    title.textContent = book.title;
    card.appendChild(title);

    const author = document.createElement("p");
    author.textContent = book.author_name ? `Author: ${book.author_name.join(", ")}` : "Unknown Author";
    card.appendChild(author);

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save Book";
    saveButton.onclick = async () => {
      const user = auth.currentUser;
      if (user) {
        await saveBook(user.uid, { title: book.title, author: book.author_name, cover: img.src });
        alert("Book saved!");
      } else {
        alert("You need to log in first.");
      }
    };
    card.appendChild(saveButton);

    container.appendChild(card);
  });
}
