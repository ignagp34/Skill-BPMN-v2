Traveler: (start Booking initiated)
Book train ticket
(send Booking Request)
(receive Payment Request)
Decide whether to pay
Is traveler paying?
Yes
Pay booking
(send Payment)
(receive Ticket)
(finish Ticket received)

...
Traveler: Decide whether to pay
Is traveler paying?
No
(receive Cancellation Notice)
(finish Cancellation notice received)

Agency: (receive Booking Request)
Create reservation
(send Payment Request)
receive Payment
Issue ticket
(send Ticket)
(finish Ticket sent)

...
Agency: receive Payment
(deadline Payment Deadline)
Cancel reservation automatically
(send Cancellation Notice)
(finish Reservation cancelled)

== pools ==
Traveler -> Traveler
Agency -> Agency
