(define (problem large-language-model-pddl-research-state-of-the-art)
  (:domain large-language-model-pddl-research)
  (:objects
    agent1 agent2 agent3 - agent
    subtask1 subtask2 subtask3 - task
  )
  (:init
    (subtask subtask1)
    (subtask subtask2)
    (subtask subtask3)
    (= (progress subtask1) 0)
    (= (progress subtask2) 0)
    (= (progress subtask3) 0)
  )
  (:goal (and
    (validated subtask1)
    (validated subtask2)
    (validated subtask3)
  ))
  (:metric minimize (+ (progress subtask1) (progress subtask2) (progress subtask3)))
)