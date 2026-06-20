import "./NavBar.css";

function NavBar() {
  return (
    <nav className="navbar">
      <a className="navbar__brand" href="#home">
        <svg
          className="navbar__logo"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <path
            d="M16 0c1.6 8.2 7.8 14.4 16 16-8.2 1.6-14.4 7.8-16 16-1.6-8.2-7.8-14.4-16-16C8.2 14.4 14.4 8.2 16 0z"
            fill="currentColor"
          />
        </svg>
        <span className="navbar__brand-text">TubeStamp</span>
      </a>

      <ul className="navbar__links">
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#blog">Blog</a></li>
      </ul>

      <button type="button" className="navbar__cta">Do More With Video</button>
    </nav>
  );
}

export default NavBar;
