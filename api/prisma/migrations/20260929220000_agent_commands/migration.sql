-- CreateTable
CREATE TABLE "agent_commands" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_commands_user_id_idx" ON "agent_commands"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_commands_user_id_agent_type_name_key" ON "agent_commands"("user_id", "agent_type", "name");

-- AddForeignKey
ALTER TABLE "agent_commands" ADD CONSTRAINT "agent_commands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
