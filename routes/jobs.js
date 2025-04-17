const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, restrictTo } = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

// Existing routes...
router.post(
  "/create",
  authenticate,
  restrictTo("RECRUITER"),
  async (req, res) => {
    try {
      const { title, description, location, salaryRange, type, requirements } =
        req.body;

      if (!title || !description || !location || !type) {
        return res.status(400).json({ message: "Required fields missing" });
      }
      const recruiter = await prisma.recruiterProfile.findUnique({  
        where: { userId: req.user.id },
      })
      if(!recruiter){
        return res.status(403).json({ message: "recruiter not found" });
      }

      const job = await prisma.job.create({
        data: {
          title,
          description,
          location,
          salaryRange,
          type,
          requirements,
          recruiterId: recruiter?.id,
        },
      });

      res.status(201).json(job);
    } catch (error) {
      res.status(500).json({ message: "Server error 1" });
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: "ACTIVE" },
      include: { recruiter: { select: { companyName: true } } },
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error 2" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { recruiter: { select: { companyName: true } } },
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: "Server error 3" });
  }
});

router.post(
  "/:id/apply",
  authenticate,
  restrictTo("JOB_SEEKER"),
  async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const existingApplication = await prisma.jobApplication.findFirst({
        where: { jobId, seekerId: req.user.id },
      });

      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      console.log("job apply");

      console.log(req?.user?.id);
      console.log(jobId);
      const application = await prisma.jobApplication.create({
        data: {
          jobId,
          seekerId: req.user.id,
        },
      });

      res.status(201).json(application);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error 4", error });
    }
  }
);

// New endpoint: List jobs posted by the authenticated recruiter
router.get(
  "/my-jobs",
  authenticate,
  restrictTo("RECRUITER"),
  async (req, res) => {
    console.log(req?.user.id);
    const recruiter = await prisma.recruiterProfile.findUnique({  
      where: { userId: req.user.id },
    })
    if(!recruiter){
      return res.status(403).json({ message: "recruiter not found" });
    }
    try {
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

// New endpoint: List applications for a specific job posted by the authenticated recruiter
router.get(
  "/:id/applications",
  authenticate,
  restrictTo("RECRUITER"),
  async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { recruiter: { select: { id: true } } },
      });
      console.log(job);
      if (!job || job.recruiterId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized or job not found" });
      }

      const applications = await prisma.jobApplication.findMany({
        where: { jobId },
        include: {
          seeker: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              skills: true,
              experience: true,
            },
          },
          job: { select: { title: true } },
        },
        orderBy: { appliedAt: "desc" },
      });

      res.json(applications);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error 6", error });
    }
  }
);

module.exports = router;
