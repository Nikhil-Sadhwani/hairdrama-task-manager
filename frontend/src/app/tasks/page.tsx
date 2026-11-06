
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_by: string;
  assigned_to: string | null;
  priority: string;
  due_date: string | null;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

export default function TasksPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [message, setMessage] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const [assigningTaskId, setAssigningTaskId] = useState("");

  const [updatingPriorityTaskId, setUpdatingPriorityTaskId] = useState("");

  const [updatingDueDateTaskId, setUpdatingDueDateTaskId] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Load Tasks
  const loadTasks = async () => {
    setIsLoadingTasks(true);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Please login first");
        return;
      }

      setCurrentUserId(data.session.user.id);

      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setTasks(result.tasks);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to load tasks"
      );
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) return;

      const response = await fetch(
        `${API_URL}/api/users`,
        {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error("Load users error:", error);
    }
  };

  const handleDueDateChange = async (
  taskId: string,
  dueDate: string
) => {

  setUpdatingDueDateTaskId(taskId);

  try {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setMessage("Please login first");
      return;
    }

    const response = await fetch(
      `${API_URL}/api/tasks/${taskId}/due-date`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          due_date: dueDate || null,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId
          ? { ...task, due_date: dueDate || null }
          : task
      )
    );

    setMessage(result.message);

  } catch (error) {
    setMessage(
      error instanceof Error ? error.message : "Deadline update failed"
    );
  } finally {
    setUpdatingDueDateTaskId("");
  }
};

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreating(true);
    setMessage("Creating task...");

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Please login first");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            title,
            description,
            assigned_to: newAssignedTo || null,
            priority,
            due_date: dueDate || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setNewAssignedTo("");

      // await loadTasks();
      setTasks((previousTasks) => [
        result.task,
        ...previousTasks,
      ]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Task creation failed"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Complete Task
  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    setMessage("Completing task...");

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Please login first");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      await loadTasks();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Task completion failed"
      );
    } finally {
      setCompletingTaskId("");
    }
  };

  // Assign / Unassign Task
  const handleAssignTask = async (
    taskId: string,
    assignedTo: string
  ) => {
    setAssigningTaskId(taskId);
    setMessage("Updating assignment...");

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Please login first");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            assigned_to: assignedTo || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      await loadTasks();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Assignment failed"
      );
    } finally {
      setAssigningTaskId("");
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    setDeletingTaskId(taskId);
    setMessage("Deleting task...");

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Please login first");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      await loadTasks();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Task deletion failed"
      );
    } finally {
      setDeletingTaskId("");
    }
  };

  const handlePriorityChange = async (
  taskId: string,
  priority: string
) => {

  setUpdatingPriorityTaskId(taskId);

  try {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setMessage("Please login first");
      return;
    }

    const response = await fetch(
      `${API_URL}/api/tasks/${taskId}/priority`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ priority }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === taskId
          ? { ...task, priority }
          : task
      )
    );

    setMessage(result.message);

  } catch (error) {
    setMessage(
      error instanceof Error ? error.message : "Priority update failed"
    );
  } finally {
    setUpdatingPriorityTaskId("");
  }
};

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">

      <h1 className="text-3xl font-bold mb-6">
        Task Management
      </h1>

      {/* CREATE TASK FORM */}

      <form
        onSubmit={handleCreateTask}
        className="bg-white p-6 rounded-xl max-w-xl space-y-4"
      >
        <h2 className="text-xl font-semibold">
          Create New Task
        </h2>

        <input
          type="text"
          placeholder="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border p-3 rounded-lg text-gray-900"
        />

        <textarea
          placeholder="Task Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-3 rounded-lg text-gray-900"
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full border p-3 rounded-lg text-gray-900"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>

        <select
          value={newAssignedTo}
          onChange={(e) => setNewAssignedTo(e.target.value)}
          className="w-full border p-3 rounded-lg text-gray-900"
        >
          <option value="">Assign to someone (Optional)</option>

          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name || user.email}
            </option>
          ))}
        </select>

        <div>
          <label className="block mb-2 font-medium">
            Task Deadline
          </label>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border p-3 rounded-lg text-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="bg-purple-600 text-white px-5 py-3 rounded-lg disabled:opacity-60"
        >
          {isCreating ? "Creating..." : "Create Task"}
        </button>

        <p className="text-sm text-gray-700">
          {message}
        </p>
      </form>

      {/* TASK LIST */}

      <section className="mt-8">

        <h2 className="text-2xl font-bold mb-4">
          My Tasks
        </h2>

        <div className="grid gap-4 max-w-xl">

          {isLoadingTasks ? (
            <p className="text-gray-600 animate-pulse">
              Loading tasks...
            </p>
          ) : tasks.length === 0 ? (
            <p className="text-gray-500">
              No tasks available.
            </p>
          ) : (
            tasks.map((task) => {

              const assignedUser = users.find(
                (user) => user.id === task.assigned_to
              );

              const priorityColor =
                task.priority === "high"
                  ? "bg-red-100 text-red-700"
                  : task.priority === "low"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700";

              return (
                <div
                  key={task.id}
                  className="bg-white p-5 rounded-xl shadow-sm space-y-3"
                >

                  <h3 className="font-semibold text-lg">
                    {task.title}
                  </h3>

                  <p className="text-gray-600">
                    {task.description || "No description"}
                  </p>

                  <div>
  <label className="block text-sm font-medium mb-2">
    Priority
  </label>

  {task.status === "pending" &&
  task.created_by === currentUserId ? (

    <select
      value={task.priority || "medium"}
      disabled={updatingPriorityTaskId === task.id}
      onChange={(e) =>
        handlePriorityChange(task.id, e.target.value)
      }
      className="w-full border p-3 rounded-lg text-gray-900 disabled:opacity-50"
    >
      <option value="low">Low Priority</option>
      <option value="medium">Medium Priority</option>
      <option value="high">High Priority</option>
    </select>

  ) : (

    <span className={`px-3 py-1 rounded-full text-sm ${priorityColor}`}>
      {task.priority || "medium"}
    </span>

  )}

  {updatingPriorityTaskId === task.id && (
    <p className="text-sm text-purple-600 mt-2">
      Updating priority...
    </p>
  )}
</div>

        

                  <div>
  <label className="block text-sm font-medium mb-2">
    Task Deadline
  </label>

  {task.status === "pending" &&
   task.created_by === currentUserId ? (

    <input
      type="date"
      value={task.due_date || ""}
      disabled={updatingDueDateTaskId === task.id}
      onChange={(e) =>
        handleDueDateChange(task.id, e.target.value)
      }
      className="w-full border p-3 rounded-lg text-gray-900 disabled:opacity-50"
    />

  ) : (

    <p className="text-sm text-gray-600">
      {task.due_date || "No deadline set"}
    </p>

  )}

  {updatingDueDateTaskId === task.id && (
    <p className="text-sm text-purple-600 mt-2">
      Updating deadline...
    </p>
  )}
</div>

                  <p className="text-sm">
                    Assigned to: {
                      assignedUser
                        ? (assignedUser.full_name || assignedUser.email)
                        : "Nobody"
                    }
                  </p>

                  <p className="text-sm font-medium">
                    Status: {task.status}
                  </p>

                  {/* ASSIGNMENT */}

                  {task.created_by === currentUserId &&
 task.status === "pending" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Change Assignment
                      </label>

                      <select
                        value={task.assigned_to || ""}
                        disabled={assigningTaskId === task.id}
                        onChange={(e) =>
                          handleAssignTask(task.id, e.target.value)
                        }
                        className="w-full border p-3 rounded-lg text-gray-900 disabled:opacity-50"
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </option>
                        ))}
                      </select>

                      {assigningTaskId === task.id && (
                        <p className="text-sm text-purple-600 mt-2">
                          Updating assignment...
                        </p>
                      )}
                    </div>
                  )}

                  {/* COMPLETE */}

                  {task.status === "pending" ? (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTaskId === task.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                    >
                      {completingTaskId === task.id
                        ? "Completing..."
                        : "Mark as Completed"}
                    </button>
                  ) : (
                    <p className="text-green-600 font-semibold">
                      Completed ✓
                    </p>
                  )}

                  {/* DELETE */}

                  {task.created_by === currentUserId && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deletingTaskId === task.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg ml-2 disabled:opacity-60"
                    >
                      {deletingTaskId === task.id
                        ? "Deleting..."
                        : "Delete Task"}
                    </button>
                  )}

                </div>
              );
            })
          )}

        </div>
      </section>
    </main>
  );
}
