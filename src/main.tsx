import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const theme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

if (theme === 'dark') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <App/>
);