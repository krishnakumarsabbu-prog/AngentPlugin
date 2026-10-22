---
name: talon-injection-matrix
description: Detailed syntax patterns, detection signatures, and source-to-sink AST heuristics for code injection vulnerabilities.
---

# Talon Audit: Code & Query Injection Matrix

Injection vulnerabilities occur when untrusted data is sent to an interpreter as part of a command or query. Talon inspects Abstract Syntax Trees (AST) and string-concatenation patterns across multiple languages.

---

## Language-Specific Injection Sinks

### 1. SQL Injection Sinks
- **Node.js / TypeScript**:
  - `db.query("SELECT * FROM users WHERE email = '" + req.body.email + "'")`
  - `sequelize.query(...)` with raw template literals
  - `knex.raw("... " + userInput)`
  - *Remediation*: Parameterized queries (`db.query('SELECT * FROM users WHERE email = $1', [email])`).
- **Python**:
  - `cursor.execute(f"SELECT * FROM accounts WHERE id = {account_id}")`
  - `cursor.execute("SELECT * FROM accounts WHERE id = %s" % (account_id,))`
  - *Remediation*: Query parameters `cursor.execute("SELECT * FROM accounts WHERE id = %s", (account_id,))`.

### 2. Command Injection Sinks
- **Node.js**:
  - `child_process.exec("ping -c 1 " + host)`
  - `child_process.execSync(...)`
  - *Remediation*: Use `child_process.execFile` or `child_process.spawn` with an arguments array, avoiding shell interpretation.
- **Python**:
  - `os.system("ping " + host)`
  - `subprocess.Popen("ping " + host, shell=True)`
  - *Remediation*: `subprocess.run(["ping", "-c", "1", host], shell=False)`.

### 3. Server-Side Template Injection (SSTI)
- **Node.js / EJS / Handlebars**:
  - `ejs.render(userTemplate, data)`
- **Python / Jinja2**:
  - `jinja2.Template(user_input).render()`
  - *Remediation*: Never pass untrusted user input as the template string itself; treat user input strictly as template context variables.
