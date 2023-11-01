-- CreateEnum
CREATE TYPE "ExecutionState" AS ENUM ('EXECUTING', 'DONE', 'ERROR', 'CANCELLED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "ExecutionState" NOT NULL DEFAULT 'EXECUTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionGraph" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT,
    "graphId" TEXT,

    CONSTRAINT "ExecutionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEdge" (
    "id" TEXT NOT NULL,
    "sId" TEXT NOT NULL,
    "tId" TEXT NOT NULL,
    "graphId" TEXT NOT NULL,

    CONSTRAINT "ExecutionEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "packets" JSONB[],
    "packetVersion" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillset" (
    "id" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserSkillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalSkillset" (
    "id" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,

    CONSTRAINT "GoalSkillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionSkillset" (
    "id" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,

    CONSTRAINT "ExecutionSkillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillConfiguration" (
    "id" TEXT NOT NULL,
    "userSkillsetId" TEXT,
    "goalSkillsetId" TEXT,
    "executionSkillsetId" TEXT,
    "value" JSONB,
    "version" INTEGER NOT NULL,

    CONSTRAINT "SkillConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skillset" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isRecommended" BOOLEAN NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "Skillset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "skillsetId" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalSkill" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,

    CONSTRAINT "GoalSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionSkill" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,

    CONSTRAINT "ExecutionSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionGraph_executionId_key" ON "ExecutionGraph"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillset_userId_skillsetId_key" ON "UserSkillset"("userId", "skillsetId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalSkillset_goalId_skillsetId_key" ON "GoalSkillset"("goalId", "skillsetId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionSkillset_executionId_skillsetId_key" ON "ExecutionSkillset"("executionId", "skillsetId");

-- CreateIndex
CREATE INDEX "user_skillset_config_index" ON "SkillConfiguration"("userSkillsetId");

-- CreateIndex
CREATE INDEX "goal_skillset_config_index" ON "SkillConfiguration"("goalSkillsetId");

-- CreateIndex
CREATE INDEX "execution_skillset_config_index" ON "SkillConfiguration"("executionSkillsetId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalSkill_goalId_skillId_key" ON "GoalSkill"("goalId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionSkill_executionId_skillId_key" ON "ExecutionSkill"("executionId", "skillId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionGraph" ADD CONSTRAINT "ExecutionGraph_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionNode" ADD CONSTRAINT "ExecutionNode_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "ExecutionGraph"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEdge" ADD CONSTRAINT "ExecutionEdge_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "ExecutionGraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ExecutionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillset" ADD CONSTRAINT "UserSkillset_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillset" ADD CONSTRAINT "UserSkillset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSkillset" ADD CONSTRAINT "GoalSkillset_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSkillset" ADD CONSTRAINT "GoalSkillset_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionSkillset" ADD CONSTRAINT "ExecutionSkillset_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionSkillset" ADD CONSTRAINT "ExecutionSkillset_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillConfiguration" ADD CONSTRAINT "SkillConfiguration_userSkillsetId_fkey" FOREIGN KEY ("userSkillsetId") REFERENCES "UserSkillset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillConfiguration" ADD CONSTRAINT "SkillConfiguration_goalSkillsetId_fkey" FOREIGN KEY ("goalSkillsetId") REFERENCES "GoalSkillset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillConfiguration" ADD CONSTRAINT "SkillConfiguration_executionSkillsetId_fkey" FOREIGN KEY ("executionSkillsetId") REFERENCES "ExecutionSkillset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_skillsetId_fkey" FOREIGN KEY ("skillsetId") REFERENCES "Skillset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSkill" ADD CONSTRAINT "GoalSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSkill" ADD CONSTRAINT "GoalSkill_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionSkill" ADD CONSTRAINT "ExecutionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionSkill" ADD CONSTRAINT "ExecutionSkill_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
