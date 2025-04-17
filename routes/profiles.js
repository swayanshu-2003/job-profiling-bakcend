const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, restrictTo } = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// Existing routes...
router.post(
  "/seeker",
  authenticate,
  restrictTo("JOB_SEEKER"),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        resume,
        skills,
        experience,
        education,
      } = req.body;

      if (!firstName || !lastName || !phone) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const profile = await prisma.seekerProfile.upsert({
        where: { userId: req.user.id },
        update: {
          firstName,
          lastName,
          phone,
          resume,
          skills,
          experience,
          education,
        },
        create: {
          userId: req.user.id,
          firstName,
          lastName,
          phone,
          resume,
          skills,
          experience,
          education,
        },
      });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.post(
  "/recruiter",
  authenticate,
  restrictTo("RECRUITER"),
  async (req, res) => {
    try {
      const { companyName, companySize, website, phone } = req.body;

      if (!companyName || !phone) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const profile = await prisma.recruiterProfile.upsert({
        where: { userId: req.user.id },
        update: { companyName, companySize, website, phone },
        create: {
          userId: req.user.id,
          companyName,
          companySize,
          website,
          phone,
        },
      });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/me", authenticate, async (req, res) => {
  console.log(req.user);
  try {
    let profile;
    if (req.user.role === "JOB_SEEKER") {
      profile = await prisma.seekerProfile.findUnique({
        where: { userId: req.user.id },
      });
    } else {
      profile = await prisma.recruiterProfile.findUnique({
        where: { userId: req.user.id },
      });
    }
    console.log(profile);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get(
  "/my-jobs",
  authenticate,
  restrictTo("RECRUITER"),
  async (req, res) => {
    console.log(req?.user.id);
    try {
      const recruiter = await prisma.recruiterProfile.findUnique({  
        where: { userId: req.user.id },
      })
      if(!recruiter){
        return res.status(403).json({ message: "recruiter not found" });
      }
      const jobs = await prisma.job.findMany({
        where: {
          recruiterId: recruiter?.id,
        },
        include: {
          recruiter: { select: { companyName: true } },
          applications: {
            select: {
              id: true,
              status: true,
              appliedAt: true,
              seeker: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      console.log(jobs);
      res.json(jobs);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "internal error 5", error });
    }
  }
);

// New endpoint: List jobs applied by the authenticated job seeker
router.get(
  "/my-applications",
  authenticate,
  restrictTo("JOB_SEEKER"),
  async (req, res) => {
    try {
      const applications = await prisma.jobApplication.findMany({
        where: { seekerId: req.user.id },
        include: {
          job: {
            select: {
              title: true,
              description: true,
              location: true,
              salaryRange: true,
              type: true,
              status: true,
              recruiter: { select: { companyName: true } },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      });

      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
