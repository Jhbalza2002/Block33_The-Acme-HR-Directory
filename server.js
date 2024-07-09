const express = require("express");
const pg = require("pg");
const morgan = require("morgan");

const app = express();
const port = process.env.PORT || 3000;
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:yourpassword@localhost/acme_hr_directory_db";
const client = new pg.Client({ connectionString: databaseUrl });

app.use(express.json());
app.use(morgan("dev"));

app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM departments`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM employees ORDER BY created_at DESC`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", async (req, res, next) => {
  try {
    const { txt, department_id } = req.body;
    const SQL = `
      INSERT INTO employees(txt, department_id)
      VALUES($1, $2)
      RETURNING *
    `;
    const response = await client.query(SQL, [txt, department_id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { txt, ranking, department_id } = req.body;
    const SQL = `
      UPDATE employees
      SET txt=$1, ranking=$2, department_id=$3, updated_at=now()
      WHERE id=$4
      RETURNING *
    `;
    const response = await client.query(SQL, [txt, ranking, department_id, id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const SQL = `DELETE FROM employees WHERE id=$1`;
    await client.query(SQL, [id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

const init = async () => {
  try {
    await client.connect();

    let SQL = `
        DROP TABLE IF EXISTS employees CASCADE;
        DROP TABLE IF EXISTS departments CASCADE;
        CREATE TABLE departments(
          id SERIAL PRIMARY KEY,
          name VARCHAR(100)
        );
        CREATE TABLE employees(
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now(),
          ranking INTEGER DEFAULT 3 NOT NULL,
          txt VARCHAR(255) NOT NULL,
          department_id INTEGER REFERENCES departments(id) NOT NULL
        );
      `;
    await client.query(SQL);

    console.log("Tables created");

    SQL = `
        INSERT INTO departments(name) VALUES('Finance');
        INSERT INTO departments(name) VALUES('Marketing');
        INSERT INTO departments(name) VALUES('Sales');
        INSERT INTO employees(txt, ranking, department_id) VALUES('Jose', 5, (SELECT id FROM departments WHERE name='Marketing'));
        INSERT INTO employees(txt, ranking, department_id) VALUES('Sebastian', 5, (SELECT id FROM departments WHERE name='Marketing'));
        INSERT INTO employees(txt, ranking, department_id) VALUES('Diego', 4, (SELECT id FROM departments WHERE name='Finance'));
        INSERT INTO employees(txt, ranking, department_id) VALUES('David', 4, (SELECT id FROM departments WHERE name='Finance'));
        INSERT INTO employees(txt, ranking, department_id) VALUES('John', 2, (SELECT id FROM departments WHERE name='Sales'));
      `;
    await client.query(SQL);

    console.log("Data seeded");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

init()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  })
  .catch((err) => console.error("Error starting server:", err));
