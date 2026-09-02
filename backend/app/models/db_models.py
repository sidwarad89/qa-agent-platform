from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    avatar_data = Column(Text, nullable=True)  # base64 data URL, kept small (resized client-side)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    agents = relationship("AgentRecord", back_populates="owner", cascade="all, delete-orphan")
    processes = relationship("AgenticProcess", back_populates="owner", cascade="all, delete-orphan")
    feedback_entries = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")


class AgentRecord(Base):
    """One row per agent the user has built - stores enough config to actually
    re-run this agent later (e.g. from inside an Agentic Process chain)."""
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    ai_provider = Column(String, nullable=True)
    ai_model_version = Column(String, nullable=True)
    framework = Column(String, nullable=True)
    workflow_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="agents")


class AgenticProcess(Base):
    """A chain of agent steps with human-in-the-loop checkpoints."""
    __tablename__ = "agentic_processes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="processes")
    steps = relationship("AgenticStep", back_populates="process", cascade="all, delete-orphan")


class AgenticStep(Base):
    """A single step's latest output within a process (overwritten on retry)."""
    __tablename__ = "agentic_steps"

    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("agentic_processes.id"), nullable=False)
    step_index = Column(Integer, nullable=False)
    step_name = Column(String, nullable=False)
    prompt = Column(Text, nullable=True)
    output = Column(Text, nullable=True)
    output_url = Column(String, nullable=True)  # e.g. the Jira subtask URL to verify against
    status = Column(String, default="pending")  # pending | awaiting_review | approved
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    process = relationship("AgenticProcess", back_populates="steps")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="feedback_entries")


class McpConnection(Base):
    """Stores which MCP tools a user has connected (credentials stay client-side / per-request, not persisted)."""
    __tablename__ = "mcp_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tool = Column(String, nullable=False)
    connected = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PageVisit(Base):
    """One row per app load - the simplest possible 'how many people are visiting' signal."""
    __tablename__ = "page_visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = not logged in yet
    path = Column(String, default="/")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
