import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <p className="footer__text">
        &copy; {new Date().getFullYear()} TubeStamp. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;
