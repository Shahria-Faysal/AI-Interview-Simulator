
const path = require("path");
const fs = require("fs");
const prisma = require("../prisma/client");

/**
 * POST /api/resumes/upload
 * Saves file metadata to the database after Multer writes the file to disk.
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a PDF file.",
      });
    }

    const { filename, size, originalname } = req.file;

    // Build the URL path that will be served by the /uploads static route
    const fileUrl = `/uploads/${filename}`;

    const resume = await prisma.resume.create({
      data: {
        userId: req.user.id,
        fileUrl,
        fileName: originalname,
        fileSize: size,
      },
    });

    res.status(201).json({
      success: true,
      message: "Resume uploaded successfully.",
      data: { resume },
    });
  } catch (error) {
    // If DB write fails, remove the orphaned file to keep the filesystem clean
    if (req.file) {
      const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
      fs.unlink(filePath, () => {}); // fire-and-forget
    }
    next(error);
  }
};

/**
 * GET /api/resumes
 * Lists all resumes belonging to the authenticated user.
 */
const getUserResumes = async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.user.id },
      orderBy: { uploadedAt: "desc" },
    });

    res.json({ success: true, data: { resumes } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resumes/:id
 * Removes a resume record and its associated file from disk.
 */
const deleteResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ensure the resume belongs to the requesting user
    const resume = await prisma.resume.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    // Delete database record first
    await prisma.resume.delete({ where: { id } });

    // Then attempt to remove the physical file
    const filename = path.basename(resume.fileUrl);
    const filePath = path.join(__dirname, "..", "uploads", filename);
    fs.unlink(filePath, (err) => {
      if (err) console.warn(`⚠️  Could not delete file ${filePath}:`, err.message);
    });

    res.json({ success: true, message: "Resume deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadResume, getUserResumes, deleteResume };
