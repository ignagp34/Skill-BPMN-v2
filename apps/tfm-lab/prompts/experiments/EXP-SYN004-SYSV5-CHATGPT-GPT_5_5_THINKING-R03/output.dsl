Claims Handler: (receive New home damage claim)
user Register claim
user Review submitted information
Is the claim complete?
No
send Request missing information
user Close current review
(finish Customer notified of missing information request)

Claims Handler: (receive New home damage claim)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
Yes
user Approve claim
send Send settlement notice
(finish Customer notified of claim approval)

Claims Handler: (receive New home damage claim)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
No
user Forward claim for detailed assessment
user Perform detailed assessment
Should the claim be approved?
Yes
user Approve claim
send Send settlement notice
(finish Customer notified of claim approval)

Claims Handler: (receive New home damage claim)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is the estimated damage below the fast-track threshold?
No
user Forward claim for detailed assessment
user Perform detailed assessment
Should the claim be approved?
No
user Reject claim
send Send rejection notice
(finish Customer notified of claim rejection)

== pools ==
Insurance Claims Team -> Claims Handler
