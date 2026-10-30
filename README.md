# E-Crime BioMatch Engin


## 1. Overview & Problem Statement

- **The Challenge:** Traditional crime case management involves maintaining case records, evidence, and biometric information separately. Managing these records manually can make information retrieval, evidence tracking, and identifying connections between cases difficult.

- **Target Audience:** Police departments, crime investigation teams, forensic departments, and authorised investigation personnel. This project is developed as an academic prototype.

- **Impact Metric:** Aims to reduce manual data entry, simplify evidence management, improve case information retrieval, and support faster identification of potential connections between registered face profiles and cases. Actual efficiency improvements will be evaluated through testing.

---

## 2. Architecture & Solution Logic

- **Concept:** E-Crime BioMatch Engine is a web-based crime case management and biometric assistance system. It allows authorised users to manage crime cases, maintain evidence records, store biometric information, register face profiles, and associate registered profiles with relevant cases.

  **System Workflow:**

  1. User login and dashboard access.
  2. Create and manage crime cases.
  3. Store and manage biometric records.
  4. Upload and manage digital evidence.
  5. Register face profiles using photographs.
  6. Generate facial descriptors for face-matching experiments.
  7. Link registered face profiles to relevant cases.
  8. Retrieve associated case and evidence information.

- **Tech / Framework Stack:**
  - **Frontend:** HTML5, CSS3, JavaScript
  - **Backend:** Node.js, Express.js
  - **Database:** MySQL
  - **Database Connectivity:** MySQL2
  - **Face Recognition:** @vladmandic/face-api
  - **Image Upload:** Multer
  - **Development Tools:** Visual Studio Code, MySQL Workbench, Git, GitHub
  - **Testing Environment:** Localhost

### Database Architecture

The project currently uses six main database tables:

1. `Cases`
2. `Evidence`
3. `Biometric_Data`
4. `Case_Biometrics`
5. `Face_Registry`
6. `Face_Case_Mapping`

---

## 3. Key Features & Prototype

- [x] **Feature 1: Crime Case Management** – Create, view, and manage crime case records using a MySQL database.
- [x] **Feature 2: Biometric Data Management** – Store and manage biometric records associated with crime cases.
- [x] **Feature 3: Digital Evidence Management** – Add, view, and delete evidence records.
- [x] **Feature 4: Face Registry** – Register individuals using photographs and facial descriptors.
- [x] **Feature 5: Case-Biometric Linking** – Associate biometric records with relevant cases.
- [x] **Feature 6: Face-Case Mapping** – Link registered face profiles to selected cases.
- [x] **Feature 7: Dashboard** – Display crime case statistics and provide navigation to project modules.
- [ ] **Feature 8: Digital FIR Module** – Develop a multi-page digital complaint submission form with complainant, incident, victim, suspect, and evidence details.
- [ ] **Feature 9: Advanced Face Matching** – Complete and test facial matching between registered profiles.

*Note: Features marked as completed represent implemented modules; the complete system still requires integration and final testing.*

---

## 4. Scalability & Next Steps

- **Phase 1 (Completed in Sprint):**
  - Core project architecture.
  - Node.js and Express backend setup.
  - MySQL database connection.
  - Crime case management.
  - Biometric data management.
  - Evidence management.
  - Face registry and case mapping prototype.

- **Phase 2 (Future Scope):**
  - Complete the four-page Digital FIR module.
  - Integrate all project modules.
  - Improve facial recognition and matching functionality.
  - Implement stronger authentication and role-based access.
  - Add comprehensive validation and automated testing.
  - Improve data security and privacy controls.
  - Generate downloadable complaint acknowledgements and reports.
  - Deploy the application to a suitable hosting environment.

### Future Enhancements

- Advanced AI-assisted face matching.
- Secure evidence storage and retrieval.
- Improved investigation dashboards.
- Detailed case reports and analytics.
- Integration with authorised external systems, subject to approval.

### Important Disclaimer

This is an academic prototype, not an official Indian police FIR registration portal. Facial recognition results are experimental investigative assistance and must not be treated as proof of identity or guilt. Real personal, biometric, and identity-document data must not be used without appropriate legal authority, consent where required, and security safeguards.

---

*Created as a BCA Final-Year Academic Project.*
