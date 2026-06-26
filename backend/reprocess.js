const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { extractResumeText } = require('./services/resumeParserService');
const { analyzeResume } = require('./services/resumeAnalysisService');
const prisma = new PrismaClient();

async function run() {
  console.log('Fetching stuck resumes...');
  const resumes = await prisma.resume.findMany({
    where: {
      analysisStatus: { in: ['pending', 'processing', 'failed'] }
    }
  });

  if (resumes.length === 0) {
    console.log('No stuck resumes found.');
  }

  for (const resume of resumes) {
    console.log(`Processing stuck resume: ${resume.id} (${resume.fileName})`);
    try {
      const filename = path.basename(resume.fileUrl);
      const filePath = path.join(__dirname, 'uploads', filename);
      
      const extractedText = await extractResumeText(filePath);
      
      await prisma.resume.update({
        where: { id: resume.id },
        data: { extractedText, parsedAt: new Date() }
      });
      
      const analysisData = await analyzeResume(extractedText);
      
      await prisma.resume.update({
        where: { id: resume.id },
        data: {
          analysisData,
          detectedSkills: analysisData.skills,
          detectedProjects: analysisData.projects,
          analysisStatus: "done"
        }
      });
      console.log(`Done processing: ${resume.id}`);
    } catch (e) {
      console.error(`Failed: ${resume.id}`, e);
      await prisma.resume.update({
        where: { id: resume.id },
        data: { analysisStatus: "failed" }
      });
    }
  }
  
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
