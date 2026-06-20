import "./LandingPage.css";
import NavBar from "./components/NavBar";
import Timestamp from "./components/Timestamp";
import Bumpups from "./components/Bumpups";
import Footer from "./components/Footer";

function LandingPage() {
  return (
    <div className="landing-page">
      <NavBar />
      <main className="landing-page__content">
        <h1 className="landing-page__title">
          Watch YouTube video at your own pace with intelligent timestamps
        </h1>
        <p className="landing-page__subtitle">
          Also, chat anything about video with AI, generate summaries, and
          insights.
        </p>
      </main>
      <Timestamp />
      <Bumpups />
      <Footer />
    </div>
  );
}

export default LandingPage;
