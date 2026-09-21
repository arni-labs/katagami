; Agent-authored demonstration, not an identity classifier or pixel verifier.
; Run: z3 -smt2 annotation-transfer.smt2
(set-option :produce-unsat-cores true)
(set-logic QF_LIA)

; Restrict colour meaning to a verdict, not every use of colour in Galley.
; Source: frozen Galley DESIGN.md lines 72-74.
; status: 0=on press, 1=hold, 2=recut
; colour: 0=cyan, 1=yellow, 2=vermilion
; presentation: 0=attached, 1=keyed shared index
; Both presentations are admitted in this example following calibration.
(declare-const status Int)
(declare-const colour Int)
(declare-const presentation Int)
(assert (and (<= 0 status) (<= status 2)))
(assert (and (<= 0 colour) (<= colour 2)))
(assert (or (= presentation 0) (= presentation 1)))
(assert (! (=> (= status 0) (= colour 0)) :named source_on_press_cyan))
(assert (=> (= status 1) (= colour 1)))
(assert (=> (= status 2) (= colour 2)))

(echo "CASE 1: colour rules allow the attached selector; no geometry modeled")
(push)
(assert (= status 0))
(assert (= presentation 0))
(check-sat)
(get-value (status colour presentation))
(pop)

(echo "CASE 2: colour rules allow the keyed selector; no geometry modeled")
(push)
(assert (= status 0))
(assert (= presentation 1))
(check-sat)
(get-value (status colour presentation))
(pop)

(echo "CASE 3: on-press vermilion conflicts with the selected source profile")
(push)
(assert (! (and (= status 0) (= colour 2)) :named requested_on_press_vermilion))
(check-sat)
(get-unsat-core)
(pop)

; Two arbitrary items with integer keys. The transformation emits the key
; belonging to the intended owner. A reader resolves the first matching key.
; This is a specification of that operation, not extracted renderer behaviour.
(declare-const key0 Int)
(declare-const key1 Int)
(declare-const owner Int)
(assert (or (= owner 0) (= owner 1)))
(define-fun emitted_key () Int (ite (= owner 0) key0 key1))
(define-fun resolved_owner () Int
  (ite (= emitted_key key0) 0 (ite (= emitted_key key1) 1 (- 1))))

(echo "CASE 4: no wrong owner exists when keys are unique")
(push)
(assert (distinct key0 key1))
(assert (not (= resolved_owner owner)))
(check-sat)
(pop)

(echo "CASE 5: removing uniqueness permits a wrong owner")
(push)
(assert (not (= resolved_owner owner)))
(check-sat)
(get-value (key0 key1 owner emitted_key resolved_owner))
(pop)
