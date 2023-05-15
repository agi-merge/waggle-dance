(define (problem LLM-collaboration-problem
  (:domain LLM-collaboration)
  (:objects
    agent1 - agent
    agent2 - agent
    agent3 - agent
    vector1 - vector
    vector2 - vector
    file1 - file
    file2 - file
  )
  (:init
    (not (context-from vector1))
    (not (context-from vector2))
    (not (browsed-web))
    (not (wrote-file file1))
    (not (wrote-file file2))
    (not (balanced ?acc ?spd))
    (not (avoided-redundancy))
    (not (sub-task-delegated agent2))
    (not (sub-task-delegated agent3))
    (not (accurate-output))
    (not (efficient-output))
    (not (adversarial-agent agent1))
    (not (adversarial-agent agent2))
    (not (adversarial-agent agent3))
  )
  (:goal
    (and
      (wrote-file file1)
      (balanced ?acc ?spd)
      (avoided-redundancy)
      (sub-task-delegated agent2)
      (accurate-output)
      (efficient-output)
    )
  )
  (:constraints
    (and
      (not (context-from vector1))
      (not (context-from vector2))
      (not (browsed-web))
      (not (wrote-file file2))
      (not (balanced ?acc ?spd))
      (not (avoided-redundancy))
      (not (sub-task-delegated agent3))
      (not (adversarial-agent agent1))
      (not (adversarial-agent agent2))
      (not (adversarial-agent agent3))
    )
  )
  (:actions
    (recall-context agent1 vector1
      :precondition (and (not (context-from vector1)) (not (adversarial-agent agent1)))
      :effect (context-from vector1)
    )
    (recall-context agent2 vector2
      :precondition (and (not (context-from vector2)) (not (adversarial-agent agent2)))
      :effect (context-from vector2)
    )
    (browse-web agent1
      :precondition (not (adversarial-agent agent1))
      :effect (browsed-web)
    )
    (browse-web agent2
      :precondition (not (adversarial-agent agent2))
      :effect (browsed-web)
    )
    (write-file agent1 file1
      :precondition (and (not (wrote-file file1)) (not (adversarial-agent agent1)))
      :effect (wrote-file file1)
    )
    (write-file agent2 file2
      :precondition (and (not (wrote-file file2)) (not (adversarial-agent agent2)))
      :effect (wrote-file file2)
    )
    (balance agent1 ?acc ?spd
      :precondition (and (not (balanced ?acc ?spd)) (not (adversarial-agent agent1)))
      :effect (balanced ?acc ?spd)
    )
    (balance agent2 ?acc ?spd
      :precondition (and (not (balanced ?acc ?spd)) (not (adversarial-agent agent2)))
      :effect (balanced ?acc ?spd)
    )
    (avoid-redundancy agent1
      :precondition (not (adversarial-agent agent1))
      :effect (avoided-redundancy)
    )
    (avoid-redundancy agent2
      :precondition (not (adversarial-agent agent2))
      :effect (avoided-redundancy)
    )
    (delegate-sub-task agent1 agent2
      :precondition (and (not (sub-task-delegated agent2)) (not (adversarial-agent agent1)))
      :effect (sub-task-delegated agent2)
    )
    (delegate-sub-task agent1 agent3
      :precondition (and (not (sub-task-delegated agent3)) (not (adversarial-agent agent1)))
      :effect (sub-task-delegated agent3)
    )
    (validate-output agent3
      :precondition (and (not (accurate-output)) (not (efficient-output)) (adversarial-agent agent3))
      :effect (and (accurate-output) (efficient-output))
    )
  )
)