Traveler: (start Train ticket needed)
user Book train ticket
(send Booking Request)
(receive Payment Request)
user Pay booking
(send Payment)
(receive Ticket)
(finish Ticket received)

Traveler: (start Train ticket needed)
user Book train ticket
(send Booking Request)
(receive Payment Request)
(receive Cancellation Notice)
(finish Cancellation notice received)

Agency: (receive Booking Request)
service Create reservation
(send Payment Request)
(receive Payment)
service Issue ticket
(send Ticket)
(finish Booking fulfilled)

Agency: (receive Booking Request)
service Create reservation
(send Payment Request)
(timer Payment deadline)
service Cancel reservation automatically
(send Cancellation Notice)
(finish Reservation cancelled)

== pools ==
Traveler Participant -> Traveler
Online Travel Agency -> Agency
