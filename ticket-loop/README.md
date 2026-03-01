Implement a ticket processing loop. This should be a python script that:

- runs claude code like

```
claude \
  "Fetch tasks from jira and output in a structured format." \
  --model sonnet
  --verbose
  --session-id "<create session id>"
  --json-schema "<exact schema to output>"
```

propose a structured format - keys should be columns, each key should include a list of task objects, ordered in the same order as they are in the column. The task objects should include at least a summary, the task, key, assignee, what tasks are blocking this tasks, anything else that is relevant.
