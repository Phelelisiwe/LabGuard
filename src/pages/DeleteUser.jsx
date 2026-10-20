import { useNavigate } from "react-router-dom";
import "./DeleteUser.css";

function DeleteUser() {
  const navigate = useNavigate();

  return (
    <div className="delete-user-page">
      <header className="delete-user-header">
        <div>
          <span className="delete-user-eyebrow">LABGUARD ADMINISTRATION</span>
          <h1>Manage User Deletion</h1>
          <p>Select the type of account you want to manage.</p>
        </div>

        <button
          type="button"
          className="delete-user-back"
          onClick={() => navigate("/admin")}
        >
          Back to Dashboard
        </button>
      </header>

      <main className="delete-user-content">
        <div className="delete-user-warning">
          <strong>Important:</strong> Deleting a user can permanently
          remove their account and associated records. Verify the
          account details before confirming any deletion.
        </div>

        <section className="delete-user-options">
          <article className="delete-user-option">
            <div className="delete-user-icon">ST</div>
            <h2>Students</h2>
            <p>
              View registered students, review their details, and
              remove student accounts when authorised.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/students")}
            >
              Manage Students
              <span aria-hidden="true"> →</span>
            </button>
          </article>

          <article className="delete-user-option">
            <div className="delete-user-icon">EM</div>
            <h2>Employees</h2>
            <p>
              View registered employees, review their roles, and
              remove employee accounts when authorised.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/employees")}
            >
              Manage Employees
              <span aria-hidden="true"> →</span>
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}

export default DeleteUser;