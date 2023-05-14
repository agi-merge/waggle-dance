(define (domain language-model)
  (:requirements :typing :concurrency)
  (:types
    action - object
    agent - object
    result - object
  )
  (:predicates
    (concurrent ?action1 - action ?action2 - action)
    (dependent ?action1 - action ?action2 - action)
    (executed ?action - action)
    (reviewed ?result - result)
    (approved ?result - result)
    (rejected ?result - result)
    (has-result ?action - action ?result - result)
  )

  (:action execute-concurrently
    :parameters (?action1 - action ?action2 - action)
    :precondition (and (concurrent ?action1 ?action2)
                       (not (executed ?action1))
                       (not (executed ?action2)))
    :effect (and (executed ?action1) (executed ?action2))
  )

  (:action execute-dependent
    :parameters (?action1 - action ?action2 - action)
    :precondition (and (dependent ?action1 ?action2)
                       (executed ?action1)
                       (not (executed ?action2)))
    :effect (executed ?action2)
  )

  (:action review-result
    :parameters (?action - action ?agent - agent)
    :precondition (and (has-result ?action ?result)
                       (not (reviewed ?result))
                       (or (approved ?result) (rejected ?result)))
    :effect (reviewed ?result)
  )

  (:action replan
    :parameters (?action - action)
    :precondition (and (executed ?action)
                       (has-result ?action ?result))
    :effect (forall (?result - result) (and (rejected ?result) (not (executed ?action))))
  )
)