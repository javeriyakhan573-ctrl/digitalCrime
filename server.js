const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================================================
// FACE PHOTO UPLOAD CONFIGURATION
// =====================================================

const faceUploadPath = path.join(__dirname, "uploads", "faces");

if (!fs.existsSync(faceUploadPath)) {
    fs.mkdirSync(faceUploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, faceUploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith("image/")) {
            return cb(new Error("Please upload an image file."));
        }

        cb(null, true);
    }
});

// =====================================================
// MYSQL CONNECTION
// =====================================================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "bio_match",
    database: "e_crime_biomatch"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");

    db.query("SELECT DATABASE() AS databaseName", (queryErr, rows) => {
        if (queryErr) {
            console.error("Could not verify database:", queryErr.message);
            return;
        }

        console.log("Connected database:", rows[0].databaseName);
    });
});

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.send("E-Crime BioMatch Engine Backend is running!");
});

// =====================================================
// CREATE CASE
// =====================================================

app.post("/api/cases", (req, res) => {
    const {
        caseId,
        caseNumber,
        caseTitle,
        crimeType,
        caseDate,
        location,
        description,
        status
    } = req.body;

    const number = String(caseNumber || caseId || "").trim();

    if (!number || !caseTitle || !crimeType) {
        return res.status(400).json({
            success: false,
            message: "Case number, case title and crime type are required."
        });
    }

    const sql = `
        INSERT INTO Cases
        (case_number, case_title, crime_type, case_date,
         location, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        number,
        String(caseTitle).trim(),
        String(crimeType).trim(),
        caseDate || null,
        location || null,
        description || null,
        status || "Active"
    ], (err, result) => {
        if (err) {
            console.error("Create case error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Failed to create case.",
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Case saved successfully!",
            caseId: result.insertId,
            caseNumber: number
        });
    });
});

// =====================================================
// GET ALL CASES
// =====================================================

app.get("/api/cases", (req, res) => {
    const sql = `
        SELECT case_id, case_number, case_title, crime_type,
               case_date, location, description, status,
               created_date, last_updated
        FROM Cases
        ORDER BY case_id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch cases.",
                error: err.message
            });
        }
        res.setHeader("X-Debug-Server-File", __filename);
        res.json(results);
    });
});

// =====================================================
// GET ONE CASE
// =====================================================

app.get("/api/cases/:id", (req, res) => {
    const caseId = Number(req.params.id);

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid case ID."
        });
    }

    const sql = `
        SELECT case_id, case_number, case_title, crime_type,
               case_date, location, description, status,
               created_date, last_updated
        FROM Cases
        WHERE case_id = ?
    `;

    db.query(sql, [caseId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch case.",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Case not found."
            });
        }

        res.json(results[0]);
    });
});

// =====================================================
// DELETE CASE
// =====================================================

app.delete("/api/cases/:id", (req, res) => {
    const caseId = Number(req.params.id);

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid case ID."
        });
    }

    db.query(
        "DELETE FROM Cases WHERE case_id = ?",
        [caseId],
        (err, result) => {
            if (err) {
                console.error("Delete case error:", err.message);

                return res.status(409).json({
                    success: false,
                    message: "Could not delete this case. It may have related records.",
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Case not found."
                });
            }

            res.json({
                success: true,
                message: "Case deleted successfully!",
                caseId
            });
        }
    );
});

// =====================================================
// GET ALL BIOMETRIC DATA
// =====================================================

app.get("/api/biometric-data", (req, res) => {
    const sql = `
        SELECT biometric_id, case_id, suspect_id,
               fingerprint_hash, facial_recognition_data,
               iris_scan_data, dna_profile,
               capture_date, capture_location
        FROM Biometric_Data
        ORDER BY biometric_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch biometric data.",
                error: err.message
            });
        }

        res.json(results);
    });
});

// =====================================================
// ADD BIOMETRIC DATA
// =====================================================

app.post("/api/biometric-data", (req, res) => {
    const {
        caseId,
        suspectId,
        fingerprintHash,
        facialData,
        irisData,
        dnaProfile,
        captureDate,
        captureLocation
    } = req.body;

    const sql = `
        INSERT INTO Biometric_Data
        (case_id, suspect_id, fingerprint_hash,
         facial_recognition_data, iris_scan_data,
         dna_profile, capture_date, capture_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        caseId || null,
        suspectId || null,
        fingerprintHash || null,
        facialData || null,
        irisData || null,
        dnaProfile || null,
        captureDate || null,
        captureLocation || null
    ], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to save biometric record.",
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Biometric record saved successfully!",
            biometricId: result.insertId
        });
    });
});

// =====================================================
// GET CASE-BIOMETRIC DATA
// =====================================================
// =====================================================
// LINK A BIOMETRIC RECORD TO A CASE
// =====================================================
app.post("/api/case-biometrics", (req, res) => {
    const caseId = Number(req.body.caseId);
    const biometricId = Number(req.body.biometricId);
    const addedByAdminId = req.body.addedByAdminId || null;

    if (
        !Number.isInteger(caseId) || caseId <= 0 ||
        !Number.isInteger(biometricId) || biometricId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid caseId and biometricId."
        });
    }

    db.query(
        "SELECT case_id FROM Cases WHERE case_id = ?",
        [caseId],
        (caseErr, caseRows) => {
            if (caseErr) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to check case.",
                    error: caseErr.message
                });
            }

            if (caseRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Case not found."
                });
            }

            db.query(
                "SELECT biometric_id, case_id FROM Biometric_Data WHERE biometric_id = ?",
                [biometricId],
                (bioErr, bioRows) => {
                    if (bioErr) {
                        return res.status(500).json({
                            success: false,
                            message: "Failed to check biometric record.",
                            error: bioErr.message
                        });
                    }

                    if (bioRows.length === 0) {
                        return res.status(404).json({
                            success: false,
                            message: "Biometric record not found."
                        });
                    }

                    const existingCaseId = bioRows[0].case_id;

                    if (
                        existingCaseId !== null &&
                        Number(existingCaseId) !== caseId
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "This biometric record belongs to a different case."
                        });
                    }

                    db.query(
                        `SELECT case_biometric_id
                         FROM Case_Biometrics
                         WHERE case_id = ? AND biometric_id = ?`,
                        [caseId, biometricId],
                        (duplicateErr, duplicateRows) => {
                            if (duplicateErr) {
                                return res.status(500).json({
                                    success: false,
                                    message: "Failed to check existing link.",
                                    error: duplicateErr.message
                                });
                            }

                            if (duplicateRows.length > 0) {
                                return res.status(409).json({
                                    success: false,
                                    message: "This biometric record is already linked to the case."
                                });
                            }

                            db.query(
                                `INSERT INTO Case_Biometrics
                                 (case_id, biometric_id, added_by_admin_id)
                                 VALUES (?, ?, ?)`,
                                [caseId, biometricId, addedByAdminId],
                                (insertErr, result) => {
                                    if (insertErr) {
                                        return res.status(500).json({
                                            success: false,
                                            message: "Failed to link biometric record.",
                                            error: insertErr.message
                                        });
                                    }

                                    res.status(201).json({
                                        success: true,
                                        message: "Biometric record linked successfully.",
                                        caseBiometricId: result.insertId
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});
app.get("/api/case-biometrics", (req, res) => {
    const sql = `
        SELECT cb.case_biometric_id, c.case_id, c.case_number, b.biometric_id,
               b.suspect_id, b.fingerprint_hash,
               b.facial_recognition_data, b.iris_scan_data,
               b.dna_profile, cb.matched_date, cb.added_by_admin_id
        FROM Cases c
        JOIN Case_Biometrics cb ON c.case_id = cb.case_id
        JOIN Biometric_Data b ON cb.biometric_id = b.biometric_id
        ORDER BY cb.matched_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch case-biometric data.",
                error: err.message
            });
        }
        console.log("RUNNING FILE:", __filename);
        console.log("Case biometrics API result:", JSON.stringify(results));
        res.setHeader("X-Debug-Server-File", __filename);
        res.json(results);
    });
});
// =====================================================
// DELETE CASE-BIOMETRIC LINK
// =====================================================
app.delete("/api/case-biometrics/:id", (req, res) => {
    const linkId = Number(req.params.id);

    if (!Number.isInteger(linkId) || linkId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid case-biometric link ID."
        });
    }

    const sql = `
        DELETE FROM Case_Biometrics
        WHERE case_biometric_id = ?
    `;

    db.query(sql, [linkId], (err, result) => {
        if (err) {
            console.error("Delete case-biometric link error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Failed to delete case-biometric link.",
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Case-biometric link not found."
            });
        }

        return res.json({
            success: true,
            message: "Case-biometric link deleted successfully."
        });
    });
});
// =====================================================
// REGISTER FACE AND LINK TO SELECTED CASE
// =====================================================

app.post("/api/face-registry", upload.single("photo"), (req, res) => {
    const personName = String(req.body.personName || "").trim();
    const caseId = Number(req.body.caseId);
    const faceDescriptor = req.body.faceDescriptor;

    const removeUploadedFile = () => {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
    };

    if (!personName) {
        removeUploadedFile();

        return res.status(400).json({
            success: false,
            message: "Person name is required."
        });
    }

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Photo is required."
        });
    }

    if (!Number.isInteger(caseId) || caseId <= 0) {
        removeUploadedFile();

        return res.status(400).json({
            success: false,
            message: "Please select a valid case."
        });
    }

    if (!faceDescriptor) {
        removeUploadedFile();

        return res.status(400).json({
            success: false,
            message: "Face descriptor is required."
        });
    }

    let descriptorArray;

    try {
        descriptorArray = JSON.parse(faceDescriptor);
    } catch (error) {
        removeUploadedFile();

        return res.status(400).json({
            success: false,
            message: "Invalid face descriptor."
        });
    }

    if (
        !Array.isArray(descriptorArray) ||
        descriptorArray.length !== 128 ||
        !descriptorArray.every(
            value =>
                typeof value === "number" &&
                Number.isFinite(value)
        )
    ) {
        removeUploadedFile();

        return res.status(400).json({
            success: false,
            message: "Face descriptor must contain 128 numeric values."
        });
    }

    // Check that the selected case exists.
    db.query(
        "SELECT case_id FROM Cases WHERE case_id = ?",
        [caseId],
        (caseError, caseRows) => {
            if (caseError) {
                removeUploadedFile();

                return res.status(500).json({
                    success: false,
                    message: "Could not verify the selected case.",
                    error: caseError.message
                });
            }

            if (caseRows.length === 0) {
                removeUploadedFile();

                return res.status(404).json({
                    success: false,
                    message: "The selected case does not exist."
                });
            }

            const photoPath = "/uploads/faces/" + req.file.filename;

            const insertPersonSQL = `
                INSERT INTO Face_Registry
                (person_name, photo_path, face_descriptor)
                VALUES (?, ?, ?)
            `;

            db.query(
                insertPersonSQL,
                [
                    personName,
                    photoPath,
                    JSON.stringify(descriptorArray)
                ],
                (personError, personResult) => {
                    if (personError) {
                        removeUploadedFile();

                        return res.status(500).json({
                            success: false,
                            message: "Failed to register person.",
                            error: personError.message
                        });
                    }

                    const personId = personResult.insertId;

                    // Link the new profile to the selected case.
                    const mappingSQL = `
                        INSERT INTO Face_Case_Mapping
                        (person_id, case_id)
                        VALUES (?, ?)
                    `;

                    db.query(
                        mappingSQL,
                        [personId, caseId],
                        (mappingError) => {
                            if (mappingError) {
                                db.query(
                                    "DELETE FROM Face_Registry WHERE person_id = ?",
                                    [personId],
                                    (cleanupError) => {
                                        if (cleanupError) {
                                            console.error(
                                                "Profile cleanup error:",
                                                cleanupError.message
                                            );
                                        }

                                        removeUploadedFile();

                                        return res.status(500).json({
                                            success: false,
                                            message: "The face profile could not be linked to the selected case.",
                                            error: mappingError.message
                                        });
                                    }
                                );

                                return;
                            }

                            res.status(201).json({
                                success: true,
                                message: "Person registered and linked to the selected case successfully!",
                                personId,
                                caseId,
                                photoPath
                            });
                        }
                    );
                }
            );
        }
    );
});

// =====================================================
// GET ALL FACE PROFILES
// =====================================================

app.get("/api/face-registry", (req, res) => {
    const sql = `
        SELECT person_id, person_name, photo_path,
               face_descriptor, registered_date
        FROM Face_Registry
        ORDER BY person_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to load stored profiles.",
                error: err.message
            });
        }

        res.json({
            success: true,
            profiles: results
        });
    });
});

// =====================================================
// GET CASES FOR A REGISTERED PERSON
// =====================================================

app.get("/api/face-registry/:personId/cases", (req, res) => {
    const personId = Number(req.params.personId);

    if (!Number.isInteger(personId) || personId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid person ID."
        });
    }

    const sql = `
        SELECT f.person_id, f.person_name, m.case_id,
               c.case_number, c.case_title, c.crime_type,
               c.location, c.status
        FROM Face_Registry f
        JOIN Face_Case_Mapping m ON f.person_id = m.person_id
        JOIN Cases c ON m.case_id = c.case_id
        WHERE f.person_id = ?
        ORDER BY m.case_id ASC
    `;

    db.query(sql, [personId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch cases for matched person.",
                error: err.message
            });
        }

        res.json({
            success: true,
            cases: results
        });
    });
});

// =====================================================
// DELETE FACE PROFILE
// =====================================================

app.delete("/api/face-registry/:id", (req, res) => {
    const personId = Number(req.params.id);

    if (!Number.isInteger(personId) || personId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid person ID."
        });
    }

    db.query(
        "SELECT photo_path FROM Face_Registry WHERE person_id = ?",
        [personId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to find face profile.",
                    error: err.message
                });
            }

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Face profile not found."
                });
            }

            const photoPath = rows[0].photo_path;

            // Delete mappings first to avoid foreign-key errors.
            db.query(
                "DELETE FROM Face_Case_Mapping WHERE person_id = ?",
                [personId],
                (mappingErr) => {
                    if (mappingErr) {
                        return res.status(500).json({
                            success: false,
                            message: "Failed to remove case links for this profile.",
                            error: mappingErr.message
                        });
                    }

                    db.query(
                        "DELETE FROM Face_Registry WHERE person_id = ?",
                        [personId],
                        (deleteErr) => {
                            if (deleteErr) {
                                return res.status(500).json({
                                    success: false,
                                    message: "Failed to delete profile.",
                                    error: deleteErr.message
                                });
                            }

                            if (
                                photoPath &&
                                photoPath.startsWith("/uploads/faces/")
                            ) {
                                const filePath = path.join(
                                    faceUploadPath,
                                    path.basename(photoPath)
                                );

                                fs.unlink(filePath, (fileErr) => {
                                    if (
                                        fileErr &&
                                        fileErr.code !== "ENOENT"
                                    ) {
                                        console.error(
                                            "Could not remove face photo:",
                                            fileErr.message
                                        );
                                    }
                                });
                            }

                            res.json({
                                success: true,
                                message: "Face profile deleted successfully."
                            });
                        }
                    );
                }
            );
        }
    );
});

// =====================================================
// ADD EVIDENCE
// =====================================================

app.post("/api/evidence", (req, res) => {
    const caseId = Number(req.body.caseId);
    const evidenceType = String(req.body.evidenceType || "").trim();
    const evidenceName = String(req.body.evidenceName || "").trim();
    const description = req.body.description;
    const evidenceDate = req.body.evidenceDate;
    const filePathValue = req.body.filePath;

    if (!Number.isInteger(caseId) || caseId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid Case ID."
        });
    }

    if (!evidenceType || !evidenceName) {
        return res.status(400).json({
            success: false,
            message: "Evidence type and evidence name are required."
        });
    }

    db.query(
        "SELECT case_id FROM Cases WHERE case_id = ?",
        [caseId],
        (checkError, rows) => {
            if (checkError) {
                return res.status(500).json({
                    success: false,
                    message: "Could not check the Case ID.",
                    error: checkError.message
                });
            }

            if (rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "That Case ID does not exist. Create the case first."
                });
            }

            const sql = `
                INSERT INTO Evidence
                (case_id, evidence_type, evidence_name,
                 description, evidence_date, file_path)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(sql, [
                caseId,
                evidenceType,
                evidenceName,
                description || null,
                evidenceDate || null,
                filePathValue || null
            ], (err, result) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to save evidence.",
                        error: err.message
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Evidence saved successfully!",
                    evidenceId: result.insertId,
                    caseId
                });
            });
        }
    );
});

// =====================================================
// GET ALL EVIDENCE
// =====================================================

app.get("/api/evidence", (req, res) => {
    const sql = `
        SELECT evidence_id, case_id, evidence_type,
               evidence_name, description, evidence_date,
               file_path, created_date
        FROM Evidence
        ORDER BY evidence_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch evidence.",
                error: err.message
            });
        }

        res.json({
            success: true,
            evidence: results
        });
    });
});

// =====================================================
// GET EVIDENCE FOR A REGISTERED PERSON'S LINKED CASES
// =====================================================

app.get("/api/face-registry/:personId/evidence", (req, res) => {
    const personId = Number(req.params.personId);

    if (!Number.isInteger(personId) || personId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid person ID."
        });
    }

    const sql = `
        SELECT
            f.person_id,
            f.person_name,
            c.case_id,
            c.case_number,
            c.case_title,
            e.evidence_id,
            e.evidence_type,
            e.evidence_name,
            e.description,
            e.evidence_date,
            e.file_path,
            e.created_date
        FROM Face_Registry f
        JOIN Face_Case_Mapping m ON f.person_id = m.person_id
        JOIN Cases c ON m.case_id = c.case_id
        JOIN Evidence e ON c.case_id = e.case_id
        WHERE f.person_id = ?
        ORDER BY e.evidence_id DESC
    `;

    db.query(sql, [personId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch evidence for this person's linked cases.",
                error: err.message
            });
        }

        res.json({
            success: true,
            personId,
            evidence: results
        });
    });
});

// =====================================================
// GET ONE EVIDENCE RECORD
// =====================================================

app.get("/api/evidence/:id", (req, res) => {
    const evidenceId = Number(req.params.id);

    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid evidence ID."
        });
    }

    const sql = `
        SELECT evidence_id, case_id, evidence_type,
               evidence_name, description, evidence_date,
               file_path, created_date
        FROM Evidence
        WHERE evidence_id = ?
    `;

    db.query(sql, [evidenceId], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch evidence.",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Evidence record not found."
            });
        }

        res.json({
            success: true,
            evidence: results[0]
        });
    });
});

// =====================================================
// DELETE EVIDENCE
// =====================================================

app.delete("/api/evidence/:id", (req, res) => {
    const evidenceId = Number(req.params.id);

    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid evidence ID."
        });
    }

    db.query(
        "DELETE FROM Evidence WHERE evidence_id = ?",
        [evidenceId],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete evidence.",
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Evidence record not found."
                });
            }

            res.json({
                success: true,
                message: "Evidence deleted successfully!",
                evidenceId
            });
        }
    );
});

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

app.get("/api/dashboard/stats", (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS totalCases,
            COALESCE(
                SUM(
                    CASE
                        WHEN LOWER(status) IN ('active', 'open')
                        THEN 1 ELSE 0
                    END
                ),
                0
            ) AS openCases,
            COALESCE(
                SUM(
                    CASE
                        WHEN LOWER(status) = 'closed'
                        THEN 1 ELSE 0
                    END
                ),
                0
            ) AS closedCases
        FROM Cases
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch dashboard statistics.",
                error: err.message
            });
        }

        res.json({
            success: true,
            stats: {
                totalCases: results[0].totalCases || 0,
                openCases: results[0].openCases || 0,
                closedCases: results[0].closedCases || 0
            }
        });
    });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
    console.error("Server error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(400).json({
        success: false,
        message: err.message || "Request failed."
    });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});