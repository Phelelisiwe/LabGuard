import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import labguardStudent from "../assets/labguard-student.jpg.jpeg";

import "./LandingPage.css";


const slides = [
  // =========================================================
  // SLIDE 1 — YOUR LABGUARD PICTURE
  // =========================================================
  {
    image: labguardStudent,
    tag: "COMPUTER SYSTEMS ENGINEERING",
    title: "Students building the future",
    text: "A modern laboratory environment supporting practical learning, technology and innovation.",
  },

  // =========================================================
  // SLIDE 2
  // =========================================================
  {
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2200&q=90",
    tag: "STUDENT LIFE",
    title: "A smarter laboratory experience",
    text: "Secure laboratory access and accurate attendance in one simple platform.",
  },

  // =========================================================
  // SLIDE 3 — YOUR LABGUARD PICTURE AGAIN
  // =========================================================
  {
    image: labguardStudent,
    tag: "SMART LABORATORY",
    title: "Technology for modern learning",
    text: "LabGuard connects students, technology and secure laboratory access.",
  },

  // =========================================================
  // SLIDE 4
  // =========================================================
  {
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2200&q=90",
    tag: "STUDENT FIRST",
    title: "Built around students",
    text: "Simple access, clear attendance and a modern university experience.",
  },

  // =========================================================
  // SLIDE 5
  // =========================================================
  {
    image:
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=2200&q=90",
    tag: "CONNECTED LEARNING",
    title: "Technology that supports learning",
    text: "Connect students, lecturers and laboratory attendance in one system.",
  },

  
];

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "workflow", label: "How It Works" },
  { id: "security", label: "Security" },
  { id: "about", label: "About" },
];


function LandingPage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [slide, setSlide] = useState(0);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);


  /* ================= PWA ================= */

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setIsInstalled(standalone);


    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };


    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };


    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener("appinstalled", handleAppInstalled);


    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);


  /* ================= ACTIVE SECTION ================= */

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);


    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio
          );


        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );


    sections.forEach((section) => observer.observe(section));


    return () => observer.disconnect();
  }, []);


  /* ================= AUTO SLIDER ================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 5000);


    return () => clearInterval(timer);
  }, []);


  /* ================= NAVIGATION ================= */

  const scrollToSection = (id) => {
    const section = document.getElementById(id);


    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };


  /* ================= INSTALL ================= */

  const installLabGuard = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }


    installPrompt.prompt();


    const { outcome } = await installPrompt.userChoice;


    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };


  /* ================= SLIDER CONTROLS ================= */

  const nextSlide = () => {
    setSlide((current) => (current + 1) % slides.length);
  };


  const previousSlide = () => {
    setSlide(
      (current) => (current - 1 + slides.length) % slides.length
    );
  };


  return (
    <div className="lg-page">


      {/* ================= NAVBAR ================= */}

      <header className="lg-navbar">
        <div className="lg-navbar-inner">


          <button
            className="lg-brand"
            onClick={() => scrollToSection("overview")}
          >
            <span className="lg-tut-mark">TUT</span>

            <span className="lg-brand-text">
              <strong>LabGuard</strong>
              <small>Computer Systems Engineering</small>
            </span>
          </button>


          <nav className="lg-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={
                  activeSection === item.id
                    ? "lg-nav-link active"
                    : "lg-nav-link"
                }
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>


          <div className="lg-nav-actions">


            {!isInstalled && (
              <button
                className="lg-install-small"
                onClick={installLabGuard}
              >
                Install
              </button>
            )}


            <button
              className="lg-login-button"
              onClick={() => navigate("/login")}
            >
              Login
            </button>


          </div>


        </div>
      </header>



      {/* =================================================
          OVERVIEW
          SLIDING PICTURES ONLY HERE
          ================================================= */}

      <section id="overview" className="lg-hero">


        {slides.map((item, index) => (
          <div
            key={item.image}
            className={
              index === slide
                ? "lg-hero-slide active"
                : "lg-hero-slide"
            }
            style={{
              backgroundImage: `url(${item.image})`,
            }}
          />
        ))}


        <div className="lg-hero-overlay"></div>


        <div className="lg-hero-content">


          <div className="lg-hero-tag">
            TSHWANE UNIVERSITY OF TECHNOLOGY
          </div>


          <h1>
            Smart laboratory
            <span> access & attendance.</span>
          </h1>


          <p>{slides[slide].text}</p>


          <div className="lg-hero-buttons">


            <button
              className="lg-primary-button"
              onClick={() => navigate("/login")}
            >
              Get Started
            </button>


            <button
              className="lg-outline-button"
              onClick={() => scrollToSection("features")}
            >
              Explore LabGuard
            </button>


          </div>


        </div>


        <div className="lg-slide-caption">
          <span>{slides[slide].tag}</span>
          <strong>{slides[slide].title}</strong>
        </div>


        <div className="lg-slider-controls">


          <button
            onClick={previousSlide}
            aria-label="Previous slide"
          >
            ←
          </button>


          <div className="lg-slide-dots">


            {slides.map((_, index) => (
              <button
                key={index}
                className={index === slide ? "active" : ""}
                onClick={() => setSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}


          </div>


          <button
            onClick={nextSlide}
            aria-label="Next slide"
          >
            →
          </button>


        </div>


        <div className="lg-scroll-indicator">
          <span></span>
          Scroll to explore
        </div>


      </section>



      {/* =================================================
          FEATURES
          NO PICTURES
          ================================================= */}

      <section id="features" className="lg-info-section">


        <div className="lg-container">


          <div className="lg-section-heading">


            <span className="lg-section-label">
              01 — FEATURES
            </span>


            <h2>
              Everything you need in one place.
            </h2>


            <p>
              LabGuard simplifies laboratory access and attendance
              for students and university staff.
            </p>


          </div>



          <div className="lg-feature-grid">


            <div className="lg-feature-card">
              <div className="lg-card-number">01</div>

              <div>
                <h3>Secure Login</h3>

                <p>
                  One secure login for authorised LabGuard users.
                </p>
              </div>
            </div>



            <div className="lg-feature-card">
              <div className="lg-card-number">02</div>

              <div>
                <h3>Biometric Verification</h3>

                <p>
                  Verify laboratory access using face or fingerprint.
                </p>
              </div>
            </div>



            <div className="lg-feature-card">
              <div className="lg-card-number">03</div>

              <div>
                <h3>Attendance Records</h3>

                <p>
                  Students can view their own attendance information.
                </p>
              </div>
            </div>



            <div className="lg-feature-card">
              <div className="lg-card-number">04</div>

              <div>
                <h3>Lecturer Monitoring</h3>

                <p>
                  Lecturers can monitor student attendance and
                  academic participation.
                </p>
              </div>
            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          HOW IT WORKS
          NO PICTURES
          ================================================= */}

      <section id="workflow" className="lg-workflow-section">


        <div className="lg-container">


          <div className="lg-section-heading centered">


            <span className="lg-section-label">
              02 — HOW IT WORKS
            </span>


            <h2>
              Simple from start to finish.
            </h2>


            <p>
              LabGuard makes laboratory attendance quick and easy.
            </p>


          </div>



          <div className="lg-workflow-line">


            <div className="lg-workflow-step">
              <div className="lg-step-circle">01</div>

              <h3>Login</h3>

              <p>
                Sign in to your LabGuard account.
              </p>
            </div>



            <div className="lg-workflow-step">
              <div className="lg-step-circle">02</div>

              <h3>Verify</h3>

              <p>
                Complete your biometric verification.
              </p>
            </div>



            <div className="lg-workflow-step">
              <div className="lg-step-circle">03</div>

              <h3>Access</h3>

              <p>
                LabGuard confirms that you are authorised.
              </p>
            </div>



            <div className="lg-workflow-step">
              <div className="lg-step-circle">04</div>

              <h3>Record</h3>

              <p>
                Your laboratory attendance is recorded.
              </p>
            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          SECURITY
          NO PICTURES
          ================================================= */}

      <section id="security" className="lg-security-section">


        <div className="lg-container">


          <div className="lg-security-layout">


            <div className="lg-security-intro">


              <span className="lg-section-label">
                03 — SECURITY
              </span>


              <h2>
                Secure access.
                <br />
                Reliable records.
              </h2>


              <p>
                LabGuard is designed to help protect laboratory
                access while maintaining accurate attendance
                information.
              </p>


            </div>



            <div className="lg-security-items">


              <div className="lg-security-item">
                <span>✓</span>

                <div>
                  <h3>Authorised Users</h3>

                  <p>
                    Only registered users can access the system.
                  </p>
                </div>
              </div>



              <div className="lg-security-item">
                <span>✓</span>

                <div>
                  <h3>Biometric Verification</h3>

                  <p>
                    Face or fingerprint verification provides
                    an additional layer of access control.
                  </p>
                </div>
              </div>



              <div className="lg-security-item">
                <span>✓</span>

                <div>
                  <h3>Attendance Protection</h3>

                  <p>
                    Attendance information is recorded against
                    the verified user.
                  </p>
                </div>
              </div>


            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          ABOUT
          NO PICTURES
          ================================================= */}

      <section id="about" className="lg-about-section">


        <div className="lg-container">


          <div className="lg-about-content">


            <div>


              <span className="lg-section-label">
                LABGUARD
              </span>


              <h2>
                Designed for modern
                <span> university laboratories.</span>
              </h2>


            </div>


            <div className="lg-about-text">


              <p>
                LabGuard is a student-focused laboratory access
                and attendance platform developed as part of
                Computer Systems Engineering.
              </p>


              <button
                className="lg-primary-button"
                onClick={() => navigate("/login")}
              >
                Enter LabGuard
              </button>


            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          FOOTER
          ================================================= */}

      <footer className="lg-footer">


        <div className="lg-footer-brand">


          <span className="lg-footer-mark">TUT</span>


          <div>
            <strong>LabGuard</strong>

            <small>
              Computer Systems Engineering
            </small>
          </div>


        </div>


        <p>
          Smart laboratory access & attendance.
        </p>


        <button onClick={() => scrollToSection("overview")}>
          Back to top ↑
        </button>


      </footer>



      {/* =================================================
          INSTALL MODAL
          ================================================= */}

      {showInstallHelp && (
        <div className="lg-modal-backdrop">


          <div className="lg-install-modal">


            <button
              className="lg-modal-close"
              onClick={() => setShowInstallHelp(false)}
            >
              ×
            </button>


            <div className="lg-modal-icon">＋</div>


            <h3>Install LabGuard</h3>


            <p>
              Your browser does not currently provide the
              automatic installation option.
            </p>


            <p>
              Use your browser's
              <strong> Install App </strong>
              or
              <strong> Add to Home Screen </strong>
              option to install LabGuard.
            </p>


            <button
              className="lg-primary-button lg-modal-button"
              onClick={() => setShowInstallHelp(false)}
            >
              Got it
            </button>


          </div>


        </div>
      )}


    </div>
  );
}


export default LandingPage;