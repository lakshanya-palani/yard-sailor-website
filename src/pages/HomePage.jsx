import AnnouncementBar from "../components/AnnouncementBar";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        <Hero />
      </main>
    </>
  );
}

export default HomePage;