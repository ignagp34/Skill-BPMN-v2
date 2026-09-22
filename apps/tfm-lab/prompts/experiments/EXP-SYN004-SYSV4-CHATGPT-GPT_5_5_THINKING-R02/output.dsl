(start New home damage claim received)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is claim complete?
No
Claims Handler: send Request missing information
Claims Handler: user Close current review
(finish Current review closed)

(start New home damage claim received)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is claim complete?
Yes
Is estimated damage below the fast-track threshold?
Yes
Claims Handler: user Approve claim
Claims Handler: send Send settlement notice
(finish Customer notified)

(start New home damage claim received)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is claim complete?
Yes
Is estimated damage below the fast-track threshold?
No
Claims Handler: user Forward claim for detailed assessment
Claims Handler: user Perform detailed assessment
Is claim approved after detailed assessment?
Yes
Claims Handler: user Approve claim
Claims Handler: send Send settlement notice
(finish Customer notified)

(start New home damage claim received)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is claim complete?
Yes
Is estimated damage below the fast-track threshold?
No
Claims Handler: user Forward claim for detailed assessment
Claims Handler: user Perform detailed assessment
Is claim approved after detailed assessment?
No
Claims Handler: user Reject claim
Claims Handler: send Send rejection notice
(finish Customer notified)