'use client';

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  AgentAssumption,
  AgentLog,
  AgentState,
  AgentTask,
  AgentTaskStatus,
  AgentTopic,
  initializeAgentState,
  stepAgent,
  AgentConstants,
} from "@/lib/agent";
import styles from "./page.module.css";

const statusLabels: Record<AgentTaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

const topicLabels: Record<AgentTopic, string> = {
  analysis: "Analysis",
  plan: "Planning",
  execution: "Execution",
  reflection: "Reflection",
  summary: "Summary",
};

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function confidenceClass(confidence: AgentAssumption["confidence"]) {
  if (confidence === "high") {
    return styles.confidenceHigh;
  }
  if (confidence === "medium") {
    return styles.confidenceMedium;
  }
  return styles.confidenceLow;
}

function taskStatusClass(status: AgentTaskStatus) {
  switch (status) {
    case "completed":
      return styles.taskStatusCompleted;
    case "in-progress":
      return styles.taskStatusActive;
    case "blocked":
      return styles.taskStatusBlocked;
    default:
      return styles.taskStatusPending;
  }
}

function topicClass(topic: AgentTopic) {
  switch (topic) {
    case "analysis":
      return styles.topicAnalysis;
    case "plan":
      return styles.topicPlan;
    case "execution":
      return styles.topicExecution;
    case "reflection":
      return styles.topicReflection;
    case "summary":
    default:
      return styles.topicSummary;
  }
}

export default function Home() {
  const [goalInput, setGoalInput] = useState(
    "Launch an ethical, autonomous onboarding assistant that accelerates user activation.",
  );
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const loopRef = useRef(false);

  const startAgent = useCallback(
    async (goal: string) => {
      if (!goal.trim()) {
        return;
      }
      loopRef.current = false;
      const initial = initializeAgentState(goal);
      setAgentState(initial);
      await delay(150);
      loopRef.current = true;
      setIsRunning(true);
      let currentState = initial;
      while (loopRef.current) {
        await delay(650);
        currentState = stepAgent(currentState);
        setAgentState(currentState);
        if (currentState.isComplete || currentState.isStalled) {
          break;
        }
        if (currentState.iteration >= AgentConstants.MAX_ITERATIONS) {
          break;
        }
      }
      loopRef.current = false;
      setIsRunning(false);
    },
    [],
  );

  const stopAgent = useCallback(() => {
    loopRef.current = false;
    setIsRunning(false);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isRunning) {
        return;
      }
      const trimmedGoal = goalInput.trim();
      if (!trimmedGoal) {
        return;
      }
      await startAgent(trimmedGoal);
    },
    [goalInput, isRunning, startAgent],
  );

  const hasState = Boolean(agentState);
  const metrics = agentState?.metrics;

  const orderedLogs = useMemo<AgentLog[]>(() => {
    if (!agentState) {
      return [];
    }
    return [...agentState.logs].sort((a, b) => a.timestamp - b.timestamp);
  }, [agentState]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Autonomous Goal Agent</h1>
          <p>
            Define a goal and watch the agent plan, act, reflect, and adapt in real time
            while honoring ethical and legal safeguards.
          </p>
        </header>

        <section className={styles.controlPanel}>
          <form className={styles.goalForm} onSubmit={handleSubmit}>
            <label htmlFor="goal" className={styles.inputLabel}>
              Goal
            </label>
            <textarea
              id="goal"
              className={styles.goalInput}
              value={goalInput}
              onChange={(event) => setGoalInput(event.target.value)}
              placeholder="Describe the mission the agent should pursue…"
              rows={3}
              disabled={isRunning}
            />
            <div className={styles.actionRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isRunning}
              >
                {isRunning ? "Running…" : "Launch Agent"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={stopAgent}
                disabled={!isRunning}
              >
                Stop
              </button>
            </div>
          </form>

          {hasState && metrics && (
            <div className={styles.metricRow}>
              <MetricCard label="Iteration" value={`#${agentState?.iteration ?? 0}`} />
              <MetricCard
                label="Completion Rate"
                value={`${metrics.completionRate}%`}
              />
              <MetricCard label="Momentum" value={`${metrics.momentum}%`} />
              <MetricCard
                label="Blocked"
                value={`${metrics.blockedCount}`}
                muted={metrics.blockedCount === 0}
              />
              <MetricCard
                label="Focus"
                value={metrics.focus.charAt(0).toUpperCase() + metrics.focus.slice(1)}
              />
            </div>
          )}

          {hasState && agentState && (
            <div className={styles.assumptionCard}>
              <h3>Operating Assumptions</h3>
              <ul>
                {agentState.assumptions.map((assumption) => (
                  <li key={assumption.id}>
                    <span className={styles.assumptionStatement}>
                      {assumption.statement}
                    </span>
                    <span
                      className={`${styles.confidenceTag} ${confidenceClass(
                        assumption.confidence,
                      )}`}
                    >
                      {assumption.confidence.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={styles.dashboard}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Strategic Plan</h2>
              <span className={styles.panelCaption}>
                {agentState?.tasks.length ?? 0} tasks
              </span>
            </div>
            <div className={styles.taskList}>
              {agentState && agentState.tasks.length > 0 ? (
                agentState.tasks.map((task) => <TaskCard key={task.id} task={task} />)
              ) : (
                <EmptyState message="Provide a goal to initialize the agent." />
              )}
            </div>
          </div>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Execution Log</h2>
              <span className={styles.panelCaption}>
                {orderedLogs.length} entries
              </span>
            </div>
            <div className={styles.logFeed}>
              {orderedLogs.length === 0 ? (
                <EmptyState message="Actions and reflections will appear here." />
              ) : (
                orderedLogs.map((log) => (
                  <article key={log.id} className={styles.logItem}>
                    <span className={`${styles.topicTag} ${topicClass(log.topic)}`}>
                      {topicLabels[log.topic]}
                    </span>
                    <p>{log.message}</p>
                    <time>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </time>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {agentState?.resultSummary && (
          <section className={styles.outcome}>
            <h2>{agentState.isComplete ? "Outcome" : "Current Status"}</h2>
            <p>{agentState.resultSummary}</p>
          </section>
        )}
      </main>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  muted?: boolean;
}

function MetricCard({ label, value, muted }: MetricCardProps) {
  return (
    <div className={`${styles.metricCard} ${muted ? styles.metricMuted : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskCard({ task }: { task: AgentTask }) {
  return (
    <article className={styles.taskCard}>
      <header className={styles.taskHeader}>
        <div>
          <h3>{task.title}</h3>
          <p>{task.detail}</p>
        </div>
        <span className={`${styles.taskStatus} ${taskStatusClass(task.status)}`}>
          {statusLabels[task.status]}
        </span>
      </header>
      {task.insights.length > 0 && (
        <ul className={styles.insightList}>
          {task.insights.map((insight, index) => (
            <li key={`${task.id}-insight-${index}`}>{insight}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className={styles.emptyState}>{message}</div>;
}
