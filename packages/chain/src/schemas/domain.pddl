(define (domain large-language-model-pddl-research)
  (:requirements :typing :fluents :durative-actions :concurrent-actions :adversarial-validation)
  (:types
    agent - object
    task - object
  )
  (:predicates
    (subtask ?t - task)
    (assigned ?t - task ?a - agent)
    (completed ?t - task)
    (validated ?t - task)
  )
  (:functions
    (progress ?t - task) - number
  )
  (:durative-action delegate-subtask
    :parameters (?t - task ?a - agent)
    :duration (= ?duration 1)
    :condition (and
      (at start (not (assigned ?t ?a)))
      (at start (subtask ?t))
    )
    :effect (and
      (at start (assigned ?t ?a))
      (at end (increase (progress ?t) 1))
    )
  )
  (:durative-action process-subtask
    :parameters (?t - task ?a - agent)
    :duration (= ?duration 5)
    :condition (and
      (at start (assigned ?t ?a))
      (at start (not (completed ?t)))
    )
    :effect (and
      (at end (completed ?t))
      (at end (increase (progress ?t) 1))
    )
  )
  (:durative-action adversarial-validation
    :parameters (?t - task ?a - agent)
    :duration (= ?duration 3)
    :condition (and
      (at start (completed ?t))
      (at start (not (validated ?t)))
    )
    :effect (and
      (at end (validated ?t))
      (at end (increase (progress ?t) 1))
    )
  )
)