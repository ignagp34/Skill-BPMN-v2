Claims Handler:
(receive Home damage claim received)
user Register claim
user Review submitted information
Is the claim complete?
No
user Request missing information
user Close current review
(finish Review closed)

Claims Handler:
(receive Home damage claim received)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is estimated damage below fast-track threshold?
Yes
user Approve claim
send Send settlement notice
(finish Claim approved and settled)

Claims Handler:
(receive Home damage claim received)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is estimated damage below fast-track threshold?
No
user Forward claim for detailed assessment
user Perform detailed assessment
Should the claim be approved?
Yes
user Approve claim
send Send settlement notice
(finish Claim approved and settled)

Claims Handler:
(receive Home damage claim received)
user Register claim
user Review submitted information
Is the claim complete?
Yes
Is estimated damage below fast-track threshold?
No
user Forward claim for detailed assessment
user Perform detailed assessment
Should the claim be approved?
No
user Reject claim
send Send rejection notice
(finish Claim rejected)