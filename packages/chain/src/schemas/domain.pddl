(define (domain LLM-collaboration)
  (:requirements :strips :typing :equality :adl)
  (:types agent vector file)
  (:predicates
    (context-from ?v - vector)
    (browsed-web)
    (wrote-file ?f - file)
    (balanced ?a - accuracy ?s - speed)
    (avoided-redundancy)
    (sub-task-delegated ?a - agent)
    (adversarial-agent ?a - agent)
    (accurate-output)
    (efficient-output)
  )

  (:action recall-context
    :parameters (?a - agent ?v - vector)
    :precondition (and (not (context-from ?v)) (not (adversarial-agent ?a)))
    :effect (context-from ?v)
  )

  (:action browse-web
    :parameters (?a - agent)
    :precondition (not (adversarial-agent ?a))
    :effect (browsed-web)
  )

  (:action write-file
    :parameters (?a - agent ?f - file)
    :precondition (and (not (wrote-file ?f)) (not (adversarial-agent ?a)))
    :effect (wrote-file ?f)
  )

  (:action balance
    :parameters (?a - agent ?acc - accuracy ?spd - speed)
    :precondition (and (not (balanced ?acc ?spd)) (not (adversarial-agent ?a)))
    :effect (balanced ?acc ?spd)
  )

  (:action avoid-redundancy
    :parameters (?a - agent)
    :precondition (not (adversarial-agent ?a))
    :effect (avoided-redundancy)
  )

  (:action delegate-sub-task
    :parameters (?a - agent ?sub - agent)
    :precondition (and (not (sub-task-delegated ?sub)) (not (adversarial-agent ?a)))
    :effect (sub-task-delegated ?sub)
  )

  (:action validate-output
    :parameters (?a - agent)
    :precondition (and (not (accurate-output)) (not (efficient-output)) (adversarial-agent ?a))
    :effect (and (accurate-output) (efficient-output))
  )