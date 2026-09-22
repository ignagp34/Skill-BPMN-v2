(start Application received)
Recruiter: user Review application
Recruiter: (send Proposed interview times)
Recruiter: (receive Selected interview time)
Recruiter: user Confirm interview
Recruiter: (send Interview confirmation)
(finish HR has confirmed interview time)

(start Application received)
Recruiter: user Review application
Recruiter: (send Proposed interview times)
Recruiter: (receive Alternative times request)
Recruiter: user Prepare alternative interview times
Recruiter: (send Alternative interview times)
Recruiter: (receive Selected interview time)
Recruiter: user Confirm interview
Recruiter: (send Interview confirmation)
(finish HR has confirmed interview time)

Applicant: (receive Proposed interview times)
Applicant: user Review proposed interview times
Is a proposed time acceptable?
Yes
Applicant: user Select proposed interview time
Applicant: (send Selected interview time)
Applicant: (receive Interview confirmation)
(finish Applicant has confirmed interview time)

Applicant: (receive Proposed interview times)
Applicant: user Review proposed interview times
Is a proposed time acceptable?
No
Applicant: (send Alternative times request)
Applicant: (receive Alternative interview times)
Applicant: user Select alternative interview time
Applicant: (send Selected interview time)
Applicant: (receive Interview confirmation)
(finish Applicant has confirmed interview time)

== pools ==
HR Department -> Recruiter
Applicant Participant -> Applicant
