Traveler: (start Train ticket needed)
user Book train ticket
(send Booking Request)
(receive Payment Request)
user Pay booking
(send Booking Payment)
(receive Ticket)
(finish Ticket received)

Traveler: (start Train ticket needed)
user Book train ticket
(send Booking Request)
(receive Payment Request)
(receive Cancellation Notice)
(finish Cancellation notice received)

Agency Operations: (receive Booking Request)
service Create reservation
(send Payment Request)
(receive Booking Payment)
service Issue ticket
(send Ticket)
(finish Booking fulfilled)

Agency Operations: (receive Booking Request)
service Create reservation
(send Payment Request)
(timer Payment deadline expires)
service Cancel reservation automatically
(send Cancellation Notice)
(finish Booking cancelled)

== pools ==
Traveler Participant -> Traveler
Online Travel Agency -> Agency Operations
