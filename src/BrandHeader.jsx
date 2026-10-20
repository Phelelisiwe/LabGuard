import "./BrandHeader.css";

function BrandHeader() {
  return (
    <header className="brand-header">
      <img
        src="/tut-logo.png"
        alt="Tshwane University of Technology logo"
        className="brand-logo"
      />

      <div className="brand-copy">
        <h1>LabGuard</h1>
        <p>Tshwane University of Technology</p>
        <span>Laboratory Access &amp; Management System</span>
      </div>
    </header>
  );
}

export default BrandHeader;