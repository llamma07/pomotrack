// dark-mode.js
// Dark Mode Logic for pomotrack
const lightModeBtn = document.querySelector(".light-mode");
const darkModeBtn = document.querySelector(".dark-mode");

const currentTheme = localStorage.getItem("theme") || "light";

if (currentTheme === "light") {
  document.body.classList.add("light-mode");
  document.body.classList.remove("dark-mode");
} else {
  document.body.classList.add("dark-mode");
  document.body.classList.remove("light-mode");
}

lightModeBtn?.addEventListener("click", () => {
  document.body.classList.add("light-mode");
  document.body.classList.remove("dark-mode");
  localStorage.setItem("theme", "light");
});

darkModeBtn?.addEventListener("click", () => {
  document.body.classList.add("dark-mode");
  document.body.classList.remove("light-mode");
  localStorage.setItem("theme", "dark");
});
