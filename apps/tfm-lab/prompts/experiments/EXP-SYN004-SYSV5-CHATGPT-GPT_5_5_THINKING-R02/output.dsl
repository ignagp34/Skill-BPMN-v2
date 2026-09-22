Claims Handler: (receive New home damage claim)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is the claim complete?
No - clearly incomplete
Claims Handler: send Request missing information
Claims Handler: user Close current review
(finish Review closed pending missing information)

Claims Handler: (receive New home damage claim)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
Yes
Claims Handler: user Approve claim
Claims Handler: send Send settlement notice
(finish Customer notified of settlement)

Claims Handler: (receive New home damage claim)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
No
Claims Handler: send Forward claim for detailed assessment
Claims Assessor: user Perform detailed assessment
Should the claim be approved?
Yes
Claims Handler: user Approve claim
Claims Handler: send Send settlement notice
(finish Customer notified of settlement)

Claims Handler: (receive New home damage claim)
Claims Handler: user Register claim
Claims Handler: user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
No
Claims Handler: send Forward claim for detailed assessment
Claims Assessor: user Perform detailed assessment
Should the claim be approved?
No
Claims Handler: user Reject claim
Claims Handler: send Send rejection notice
(finish Customer notified of rejection)

== pools ==
Insurance Claims Team -> Claims Handler; Claims Assessor
