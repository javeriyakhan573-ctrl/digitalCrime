const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// SERVE PROJECT FILES
// =====================================================

app.use(
    express.static(__dirname)
);


// =====================================================
// SERVE UPLOADED FILES
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);


// =====================================================
// FACE PHOTO UPLOAD CONFIGURATION
// =====================================================

const faceUploadPath =
    path.join(
        __dirname,
        "uploads",
        "faces"
    );


if (!fs.existsSync(faceUploadPath)) {

    fs.mkdirSync(
        faceUploadPath,
        {
            recursive: true
        }
    );

}


const storage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                faceUploadPath
            );

        },


        filename: function (
            req,
            file,
            cb
        ) {

            const uniqueName =
                Date.now() +
                "-" +
                Math.round(
                    Math.random() * 1E9
                ) +
                path.extname(
                    file.originalname
                );

            cb(
                null,
                uniqueName
            );

        }

    });


const upload =
    multer({
        storage: storage
    });


// =====================================================
// MYSQL CONNECTION
// =====================================================

const db =
    mysql.createConnection({

        host: "localhost",

        user: "root",

        password: "bio_match",

        database: "E_Crime_Biomatch"

    });


db.connect(
    (err) => {

        if (err) {

            console.log(
                "MySQL connection failed:",
                err.message
            );

            return;

        }


        console.log(
            "MySQL connected successfully!"
        );

    }
);


// =====================================================
// HOME
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.send(
            "E-Crime BioMatch Engine Backend is running!"
        );

    }
);


// =====================================================
// CREATE CASE
// =====================================================

app.post(
    "/api/cases",
    (req, res) => {

        console.log(
            "Create Case request received"
        );


        const {
            caseId,
            caseTitle,
            crimeType,
            caseDate,
            location,
            description,
            status
        } = req.body;


        const sql = `
            INSERT INTO cases
            (
                case_number,
                case_title,
                crime_type,
                case_date,
                location,
                description,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;


        db.query(
            sql,
            [
                caseId,
                caseTitle,
                crimeType,
                caseDate,
                location,
                description,
                status
            ],
            (err, result) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        message:
                            "Failed to create case",

                        error:
                            err.message

                    });

                }


                console.log(
                    "Case saved successfully!"
                );


                res.json({

                    message:
                        "Case saved successfully",

                    caseId:
                        result.insertId

                });

            }
        );

    }
);


// =====================================================
// GET ALL CASES
// =====================================================

app.get(
    "/api/cases",
    (req, res) => {

        console.log(
            "Fetching cases"
        );


        const sql = `
            SELECT
                case_id,
                case_number,
                case_title,
                crime_type,
                case_date,
                location,
                description,
                status,
                created_date,
                last_updated
            FROM cases
            ORDER BY case_id DESC
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        message:
                            "Failed to fetch cases",

                        error:
                            err.message

                    });

                }


                res.json(
                    results
                );

            }
        );

    }
);


// =====================================================
// GET ONE CASE
// =====================================================

app.get(
    "/api/cases/:id",
    (req, res) => {

        console.log(
            "GET ONE CASE ROUTE:",
            req.params.id
        );


        const caseId =
            req.params.id;


        const sql = `
            SELECT
                case_id,
                case_number,
                case_title,
                crime_type,
                case_date,
                location,
                description,
                status,
                created_date,
                last_updated
            FROM cases
            WHERE case_id = ?
        `;


        db.query(
            sql,
            [caseId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        message:
                            "Failed to fetch case",

                        error:
                            err.message

                    });

                }


                if (
                    results.length === 0
                ) {

                    return res.status(404).json({

                        message:
                            "Case not found"

                    });

                }


                res.json(
                    results[0]
                );

            }
        );

    }
);


// =====================================================
// GET ALL BIOMETRIC DATA
// =====================================================

app.get(
    "/api/biometric-data",
    (req, res) => {

        console.log(
            "Fetching biometric data"
        );


        const sql = `
            SELECT
                biometric_id,
                case_id,
                suspect_id,
                fingerprint_hash,
                facial_recognition_data,
                iris_scan_data,
                dna_profile,
                capture_date,
                capture_location
            FROM Biometric_Data
            ORDER BY biometric_id DESC
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        message:
                            "Failed to fetch biometric data",

                        error:
                            err.message

                    });

                }


                res.json(
                    results
                );

            }
        );

    }
);


// =====================================================
// GET CASE-BIOMETRIC DATA
// =====================================================

app.get(
    "/api/case-biometrics",
    (req, res) => {

        console.log(
            "Fetching case-biometric data"
        );


        const sql = `
            SELECT
                c.case_id,
                c.case_number,
                b.biometric_id,
                b.suspect_id,
                b.fingerprint_hash,
                b.facial_recognition_data,
                b.iris_scan_data,
                b.dna_profile,
                cb.matched_date,
                cb.added_by_admin_id
            FROM cases c
            JOIN Case_Biometrics cb
                ON c.case_id = cb.case_id
            JOIN Biometric_Data b
                ON cb.biometric_id = b.biometric_id
            ORDER BY cb.matched_date DESC
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        message:
                            "Failed to fetch case-biometric data",

                        error:
                            err.message

                    });

                }


                res.json(
                    results
                );

            }
        );

    }
);


// =====================================================
// ADD BIOMETRIC DATA
// =====================================================

app.post(
    "/api/biometric-data",
    (req, res) => {

        console.log(
            "Add biometric request received"
        );


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
            (
                case_id,
                suspect_id,
                fingerprint_hash,
                facial_recognition_data,
                iris_scan_data,
                dna_profile,
                capture_date,
                capture_location
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;


        db.query(
            sql,
            [
                caseId || null,
                suspectId,
                fingerprintHash || null,
                facialData || null,
                irisData || null,
                dnaProfile || null,
                captureDate || null,
                captureLocation || null
            ],
            (err, result) => {

                if (err) {

                    console.log(
                        "Database error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to save biometric record",

                        error:
                            err.message

                    });

                }


                console.log(
                    "Biometric record saved successfully!"
                );


                res.json({

                    success: true,

                    message:
                        "Biometric record saved successfully",

                    biometricId:
                        result.insertId

                });

            }
        );

    }
);


// =====================================================
// REGISTER FACE
// =====================================================

app.post(
    "/api/face-registry",
    upload.single("photo"),
    (req, res) => {

        console.log(
            "Face registration request received"
        );


        const personName =
            req.body.personName;


        const faceDescriptor =
            req.body.faceDescriptor;


        if (!personName) {

            if (req.file) {

                fs.unlinkSync(
                    req.file.path
                );

            }


            return res.status(400).json({

                success: false,

                message:
                    "Person name is required"

            });

        }


        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Photo is required"

            });

        }


        if (!faceDescriptor) {

            fs.unlinkSync(
                req.file.path
            );


            return res.status(400).json({

                success: false,

                message:
                    "Face descriptor is required"

            });

        }


        let descriptorArray;


        try {

            descriptorArray =
                JSON.parse(
                    faceDescriptor
                );

        }

        catch (error) {

            fs.unlinkSync(
                req.file.path
            );


            return res.status(400).json({

                success: false,

                message:
                    "Invalid face descriptor"

            });

        }


        if (
            !Array.isArray(
                descriptorArray
            ) ||
            descriptorArray.length !== 128
        ) {

            fs.unlinkSync(
                req.file.path
            );


            return res.status(400).json({

                success: false,

                message:
                    "Face descriptor must contain 128 values"

            });

        }


        const photoPath =
            "/uploads/faces/" +
            req.file.filename;


        const sql = `
            INSERT INTO Face_Registry
            (
                person_name,
                photo_path,
                face_descriptor
            )
            VALUES (?, ?, ?)
        `;


        db.query(
            sql,
            [
                personName,
                photoPath,
                faceDescriptor
            ],
            (err, result) => {

                if (err) {

                    console.log(
                        "Face Registry database error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to register person",

                        error:
                            err.message

                    });

                }


                console.log(
                    "Face registered successfully!"
                );


                res.json({

                    success: true,

                    message:
                        "Person registered successfully",

                    personId:
                        result.insertId,

                    photoPath:
                        photoPath

                });

            }
        );

    }
);


// =====================================================
// GET ALL FACE PROFILES
// =====================================================

app.get(
    "/api/face-registry",
    (req, res) => {

        console.log(
            "Fetching stored face profiles"
        );


        const sql = `
            SELECT
                person_id,
                person_name,
                photo_path,
                face_descriptor,
                registered_date
            FROM Face_Registry
            ORDER BY person_id DESC
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Face Registry database error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to load stored profiles",

                        error:
                            err.message

                    });

                }


                res.json({

                    success: true,

                    profiles:
                        results

                });

            }
        );

    }
);


// =====================================================
// GET CASES FOR MATCHED PERSON
// =====================================================

app.get(
    "/api/face-registry/:personId/cases",
    (req, res) => {

        const personId =
            req.params.personId;


        console.log(
            "Fetching cases for Person ID:",
            personId
        );


        const sql = `
            SELECT
                f.person_id,
                f.person_name,
                m.case_id,
                c.case_number,
                c.case_title,
                c.crime_type,
                c.location,
                c.status
            FROM Face_Registry f
            JOIN Face_Case_Mapping m
                ON f.person_id = m.person_id
            JOIN cases c
                ON m.case_id = c.case_id
            WHERE f.person_id = ?
            ORDER BY m.case_id DESC
        `;


        db.query(
            sql,
            [personId],
            (err, results) => {

                if (err) {

                    console.log(
                        "Face case lookup error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to fetch cases for matched person",

                        error:
                            err.message

                    });

                }


                res.json({

                    success: true,

                    cases:
                        results

                });

            }
        );

    }
);


// =====================================================
// DELETE FACE PROFILE
// =====================================================

app.delete(
    "/api/face-registry/:id",
    (req, res) => {

        const personId =
            req.params.id;


        console.log(
            "Deleting face profile:",
            personId
        );


        const selectSql = `
            SELECT
                photo_path
            FROM Face_Registry
            WHERE person_id = ?
        `;


        db.query(
            selectSql,
            [personId],
            (err, results) => {

                if (err) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to find face profile",

                        error:
                            err.message

                    });

                }


                if (
                    results.length === 0
                ) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Face profile not found"

                    });

                }


                const photoPath =
                    results[0].photo_path;


                const deleteSql = `
                    DELETE FROM Face_Registry
                    WHERE person_id = ?
                `;


                db.query(
                    deleteSql,
                    [personId],
                    (deleteErr) => {

                        if (deleteErr) {

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Failed to delete profile",

                                error:
                                    deleteErr.message

                            });

                        }


                        if (photoPath) {

                            const filePath =
                                path.join(
                                    __dirname,
                                    photoPath.replace(
                                        "/uploads/",
                                        "uploads/"
                                    )
                                );


                            if (
                                fs.existsSync(
                                    filePath
                                )
                            ) {

                                fs.unlinkSync(
                                    filePath
                                );

                            }

                        }


                        res.json({

                            success: true,

                            message:
                                "Face profile deleted successfully"

                        });

                    }
                );

            }
        );

    }
);


// =====================================================
// ADD EVIDENCE
// =====================================================

app.post(
    "/api/evidence",
    (req, res) => {

        console.log(
            "Add evidence request received"
        );


        const {
            caseId,
            evidenceType,
            evidenceName,
            description,
            evidenceDate,
            filePath
        } = req.body;


        if (!caseId) {

            return res.status(400).json({

                success: false,

                message:
                    "Case ID is required"

            });

        }


        if (!evidenceType) {

            return res.status(400).json({

                success: false,

                message:
                    "Evidence type is required"

            });

        }


        if (!evidenceName) {

            return res.status(400).json({

                success: false,

                message:
                    "Evidence name is required"

            });

        }


        const sql = `
            INSERT INTO Evidence
            (
                case_id,
                evidence_type,
                evidence_name,
                description,
                evidence_date,
                file_path
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        db.query(
            sql,
            [
                caseId,
                evidenceType,
                evidenceName,
                description || null,
                evidenceDate || null,
                filePath || null
            ],
            (err, result) => {

                if (err) {

                    console.log(
                        "Evidence database error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to save evidence",

                        error:
                            err.message

                    });

                }


                console.log(
                    "Evidence saved successfully!"
                );


                res.json({

                    success: true,

                    message:
                        "Evidence saved successfully",

                    evidenceId:
                        result.insertId

                });

            }
        );

    }
);


// =====================================================
// GET ALL EVIDENCE
// =====================================================

app.get(
    "/api/evidence",
    (req, res) => {

        console.log(
            "Fetching all evidence"
        );


        const sql = `
            SELECT
                evidence_id,
                case_id,
                evidence_type,
                evidence_name,
                description,
                evidence_date,
                file_path,
                created_date
            FROM Evidence
            ORDER BY evidence_id DESC
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Evidence database error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to fetch evidence",

                        error:
                            err.message

                    });

                }


                res.json({

                    success: true,

                    evidence:
                        results

                });

            }
        );

    }
);


// =====================================================
// DASHBOARD STATISTICS
// =====================================================

app.get(
    "/api/dashboard/stats",
    (req, res) => {

        console.log(
            "Fetching dashboard statistics"
        );


        const sql = `
            SELECT

                COUNT(*) AS totalCases,

                SUM(
                    CASE
                        WHEN LOWER(status)
                        IN ('active', 'open')
                        THEN 1
                        ELSE 0
                    END
                ) AS openCases,

                SUM(
                    CASE
                        WHEN LOWER(status) = 'closed'
                        THEN 1
                        ELSE 0
                    END
                ) AS closedCases

            FROM cases
        `;


        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.log(
                        "Dashboard statistics error:",
                        err.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Failed to fetch dashboard statistics",

                        error:
                            err.message

                    });

                }


                res.json({

                    success: true,

                    stats: {

                        totalCases:
                            results[0].totalCases || 0,

                        openCases:
                            results[0].openCases || 0,

                        closedCases:
                            results[0].closedCases || 0

                    }

                });

            }
        );

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    3000,
    () => {

        console.log(
            "Server running at http://localhost:3000"
        );

    }
);