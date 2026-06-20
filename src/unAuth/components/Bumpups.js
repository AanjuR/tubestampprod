import "./Bumpups.css";

function Bumpups() {
  return (
    <section id="bumpups" className="bumpups bumpups--card">
      <div className="bumpups__content">
        <h2 className="bumpups__title">
          <span className="bumpups__highlight">Bumpups</span>
        </h2>
        <p className="bumpups__text">
          Highlight the moments that matter and bump them to the top.
        </p>

        <a className="bumpups__more" href="#bumpups">
          <span className="bumpups__more-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17L17 7M17 7H8M17 7V16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Learn more
        </a>
      </div>
    </section>
  );
}

export default Bumpups;
