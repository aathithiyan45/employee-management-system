import { useState } from "react";
import axios from "axios";

function SearchEmployee() {
  const [empId, setEmpId] = useState("");
  const [employee, setEmployee] = useState(null);

  const searchEmployee = async () => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/employee/${empId}/`
      );
      setEmployee(res.data);
    } catch (err) {
      alert("Employee not found");
    }
  };

  return (
    <div>
      <h2>Search Employee</h2>

      <input
        type="text"
        placeholder="Enter Employee ID"
        value={empId}
        onChange={(e) => setEmpId(e.target.value)}
      />

      <button onClick={searchEmployee}>Search</button>

      {employee && (
        <div style={{ marginTop: "20px" }}>
          <h3>{employee.name}</h3>
          <p>ID: {employee.emp_id}</p>
          <p>Passport: {employee.passport_no}</p>
          <p>WP: {employee.work_permit_no}</p>
          <p>Expiry: {employee.wp_expiry}</p>
        </div>
      )}
    </div>
  );
}

export default SearchEmployee;