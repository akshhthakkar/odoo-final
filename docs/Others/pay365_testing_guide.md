

## Pay365	���	Full	Manual	Testing	Guide
## Pay365	—	Full	Manual	Testing	Guide
- Before	you	start
TEST	1	—	Login	&	Session
TEST	2	—	Navigation	/	UI
TEST	3	—	Employee	Master
TEST	4	—	Employee	Validation
TEST	5	—	Contracts
TEST	6	—	Working	Schedules
TEST	7	—	Attendance
TEST	8	—	Time	Off
TEST	9	—	Leave	Allocation
TEST	10	—	Leave	Request
TEST	11	—	Leave	Approval
TEST	12	—	Leave	Security
TEST	13	—	Salary	Structures
TEST	14	—	Salary	Rule	Configuration
TEST	15	—	Salary	Rule	Security
TEST	16	—	Payrun	Wizard
TEST	17	—	Payrun	Compute
TEST	18	—	Payrun	Warnings
TEST	19	—	Payrun	State	Machine
TEST	20	—	Payslip
TEST	21	—	Historical	Payslip
## TEST	22	—	PDF
TEST	23	—	Email
TEST	24	—	Dashboard
TEST	25	—	CSV	/	Reports
TEST	26	—	Employee	Self-Service
TEST	27	—	HR	Manager
TEST	28	—	HR	Payroll	User
TEST	29	—	HR	Payroll	Manager
TEST	30	—	Admin
## THE	MOST	IMPORTANT	TEST:	COMPLETE	BUSINESS	FLOW
## FINAL	“BREAK	THE	SYSTEM”	PASS
What	I	would	prioritize	tonight

## Pay365	—	Full	Manual	Testing	Guide
- Before	you	start
Open	Pay365	in	the	browser	and	have	these	accounts	ready:
## ADMIN
## HR_MANAGER
## HR_PAYROLL_USER
## HR_PAYROLL_MANAGER
## EMPLOYEE
Use	your	seeded/demo	users.
Open	two	browser	windows	or	profiles:
Window	A	→	Admin	/	HR
## Window	B	→	Employee
This	lets	you	test	permission	boundaries	without	constantly	logging	in/out.
Also	keep	one	notepad/spreadsheet	open	and	record:
Test	ID	|	Action	|	Expected	|	Actual	|	PASS/FAIL	|	Notes
Don’t	just	click	around	randomly.	Test	each	workflow	from	beginning	to	end.
TEST	1	—	Login	&	Session
1.1	Admin	login
Go	to:
## Login
Enter	valid	admin	credentials.
## Expected:
✅	Login	succeeds
✅	Dashboard	appears
✅	Correct	user’s	name/role	shown
✅	Correct	navigation	available
1.2	Wrong	password
Log	out.
Enter	correct	email	+	wrong	password.
## Expected:
❌	Login	rejected
✅	Clear	error	message
✅	No	partial	login
## 1.3	Logout
Login	again	→	Logout.
Then	manually	navigate	back	to	a	protected	page.

## Expected:
✅	Session	is	gone
✅	Protected	page	redirects/rejects	access
## 1.4	Refresh
Login	→	Dashboard	→	browser	refresh.
## Expected:
✅	Still	authenticated
✅	Dashboard	data	remains
The	specification	requires	authentication	and	role-specific	access,	including	employees	having	no
HR/payroll	administration	access.
TEST	2	—	Navigation	/	UI
As	ADMIN,	inspect	the	main	navigation.
You	should	be	able	to	reach:
## Dashboard
## Employees
## Contracts
## Working	Schedules
## Attendance
## Time	Off
## Payroll
## Reports
This	matches	the	required	operational	navigation.
## Check:
✅	No	broken	links
✅	No	blank	pages
## ✅	No	404s
✅	Sidebar/nav	highlights	correct	page
✅	Back	navigation	works
✅	Refresh	doesn’t	break	page
Click	every	navigation	item	once.
TEST	3	—	Employee	Master
Go	to:
## Employees
3.1	List	view
## Check:
✅	Employees	load
✅	Search	works
✅	Filters	work
✅	Sort	works

✅	Employee	counts	look	sensible
## 3.2	Kanban
Switch	to	Kanban.
## Expected:
✅	Cards	render
✅	Employee	information	correct
✅	Clicking	card	opens	employee
3.3	Create	employee
Create	a	temporary	employee.
## Enter:
## Name
## Email
## Department
## Job
## Manager
## Schedule
## Status
Bank	details
## Save.
## Expected:
✅	Employee	created
✅	Appears	in	list
✅	Opens	correctly
The	problem	statement	specifically	calls	for	Kanban/List/Form	views	and	an	employee	form	acting	as	the
central	hub.
3.4	Employee	detail
Open	the	employee.
Verify	the	related/smart	buttons	for:
## Contracts
## Attendance
## Time	Off
## Allocations
Click	each.
## Expected:
✅	Correct	filtered	records
✅	Correct	employee
✅	No	unrelated	records
The	brief	explicitly	expects	these	related-record	links	from	the	Employee	Form.
TEST	4	—	Employee	Validation
Create	another	temporary	employee	and	deliberately	enter	bad	data.
## Test:
Future	DOB

Future	hire	date
Invalid	email
Invalid	IFSC
Invalid	bank	account
Missing	required	name
## Expected:
✅	Validation	appears
✅	Record	is	NOT	created
✅	Error	is	understandable
Then	create	one	with	valid	values.
## Expected:
✅	Created	successfully
TEST	5	—	Contracts
Go	to:
## Contracts
Create	a	contract	for	your	test	employee.
## Enter:
Start	date
End	date
## Wage
Contract	type
## Department
## Job
Working	schedule
Salary	structure
## Expected:
## ✅	Saves
✅	Employee	association	correct
✅	Dates	correct
✅	Wage	correct
The	requirement	is	that	contracts	maintain	history	while	payroll	uses	the	contract	applicable	to	the
selected	payroll	period.
5.1	Contract	overlap	test
## Create:
## Contract	A
## Jan	1	→	Dec	31
## ACTIVE
## Try:
## Contract	B
## Jun	1	→	Dec	31
## ACTIVE
## Expected:
## ❌	Rejected

✅	Clear	error
5.2	Historical	contract
## Create:
Old	contract
## Jan	→	Jun
## EXPIRED
New	contract
## Jul	→	Dec
## ACTIVE
Later	you’ll	use	this	to	test	payroll	contract	selection.
TEST	6	—	Working	Schedules
Go	to:
## Working	Schedules
## Create:
## Monday	09:00–18:00
## Tuesday	09:00–18:00
## ...
Break	=	60	minutes
Check	weekly	hours.
## Expected:
✅	Weekly	hours	automatically	calculated
✅	Correct	total
The	brief	explicitly	requires	weekly	hours	to	be	calculated	from	the	schedule	rather	than	manually
entered.
Test	invalid:
End	time	before	start
Negative	break
Invalid	day
## Expected:
## ❌	Rejected
TEST	7	—	Attendance
This	deserves	serious	manual	testing	because	attendance	feeds	payroll.
Go	to:
## Attendance
7.1	Employee	self-service
Login	as	EMPLOYEE.
Check	in.

## Expected:
✅	Attendance	created
✅	Correct	employee
✅	Correct	IST	date
Check	out.
## Expected:
✅	Checkout	recorded
✅	Worked	hours	calculated
## 7.2	Exception
Create	an	attendance	that	should	be	late/overtime/missing	checkout.
## Verify:
✅	Correct	status
✅	Correct	worked	hours
✅	Exception	visible
7.3	Invalid	checkout
## Attempt:
## Check-in:	10:00
## Check-out:	09:00
## Expected:
## ❌	Rejected
✅	Clear	error
7.4	Security	test
As	EMPLOYEE,	attempt	to	manipulate	another	employee’s	attendance	through	the	UI.
Then,	importantly,	try	any	employee	selector	or	editable	employee	field	that	the	frontend	exposes.
## Expected:
✅	Cannot	modify	another	employee
The	platform	requires	employee	attendance	creation	while	restricting	HR	administration	according	to
roles.
TEST	8	—	Time	Off
Go	to:
## Time	Off	→	Types
## Create/check:
## Casual	Leave
## Sick	Leave
## Paid	Leave
## Verify:
## Unit
Allocation	required
Approval	workflow
Payroll	integration

The	brief	explicitly	defines	Time	Off	around	types,	allocations,	requests,	approval	and	balances.
TEST	9	—	Leave	Allocation
## Create:
## Employee:	Test	Employee
Leave	type:	Casual	Leave
Allocated:	12	days
Approve	the	allocation	if	your	UI	requires	it.
## Expected:
## Allocated	=	12
## Taken	=	0
## Remaining	=	12
Then	create	a	second	allocation	later	if	the	system	supports	it.
Verify	allocation	validity	dates.
TEST	10	—	Leave	Request
Login	as	the	employee.
Go	to:
## Time	Off	→	Requests
## Create:
## Date	From:	Oct	1
## Date	To:	Oct	2
Do	NOT	trust	whatever	duration	the	UI	displays	blindly.
Verify	that	the	server-calculated	duration	is	correct.
## Expected:
2	working	days
## Submit.
## Expected:
Status	=	TO_APPROVE	/	Pending
TEST	11	—	Leave	Approval
Login	as	HR	Manager.
Open	pending	request.
## Approve.
## Expected:
Status	→	APPROVED
Allocation	Taken	→	increases	correctly
Remaining	→	decreases	correctly
Then	check	from	the	employee	account.

## Expected:
✅	New	balance	visible
This	directly	tests	the	required	lifecycle	where	approved	requests	reduce	allocations.
TEST	12	—	Leave	Security
This	is	important.
Take	an	employee	account	and	attempt:
Approve	own	leave
## Expected:
## ❌	403	/	Forbidden
Then	have	another	authorized	HR	user	approve	it.
## Expected:
✅	Approval	succeeds
TEST	13	—	Salary	Structures
Go	to:
## Payroll	→	Salary	Structures
Open	your	salary	structure.
You	should	see	rules	similar	to:
## BASIC
## HRA
## TRANSPORT
## GROSS
## PF
## TAX
## NET
The	problem	statement	requires	salary	structures	to	act	as	containers	for	salary	rules	and	the	selected
structure	to	drive	payrun	calculation.
## Check:
✅	Structure	exists
✅	Rules	visible
✅	Sequence	visible
✅	Active	status
✅	Rule	count
TEST	14	—	Salary	Rule	Configuration
Open	each	rule.
## Test:
## FIXED
## PERCENTAGE
## FORMULA

For	example:
## BASIC	=	₹50,000
## HRA	=	20%	BASIC
## TRANSPORT	=	₹3,000
## GROSS	=	BASIC	+	HRA	+	TRANSPORT
## PF	=	12%	BASIC
## TAX	=	₹2,000
## NET	=	GROSS	-	PF	-	TAX
## Expected:
RuleAmount
## BASIC50,000
## HRA10,000
## TRANSPORT3,000
## GROSS63,000
## PF6,000
## TAX2,000
## NET55,000
The	specification	explicitly	requires	configurable	fixed,	percentage	and	formula-based	salary	rules
processed	in	sequence.
TEST	15	—	Salary	Rule	Security
Login	as:
## HR_PAYROLL_USER
Try	editing	a	salary	rule.
## Expected:
❌	Cannot	edit
✅	Can	view
Login	as:
## HR_PAYROLL_MANAGER
## Expected:
✅	Can	edit
This	tests	the	exact	role	difference	required	by	the	brief.
TEST	16	—	Payrun	Wizard
This	is	one	of	the	most	important	tests.
Go	to:
## Payroll	→	Payruns	→	New

The	brief	specifically	requires	a	two-step	wizard.
## Step	1
## Select:
## Salary	Structure
## Period	Start
## Period	End
## Click:
## Continue
## Expected:
✅	No	premature	Payrun	creation
✅	Step	2	opens
## Step	2
Filter	employees.
Select	specific	employees.
## Expected:
✅	Employee	list	correct
✅	Only	selected	employees	included
## Click:
## Create	Payrun
## Expected:
✅	Payrun	created
✅	Correct	employees
✅	Correct	structure
✅	Correct	period
TEST	17	—	Payrun	Compute
Open	the	new	Payrun.
## Click:
## Compute
Watch	for:
loading
warnings
payslips
totals
status
## Expected:
## DRAFT
## ↓
## COMPUTED

Verify	payslip	exists.
Open	payslip.
Compare	every	number	against	your	expected	calculation.
This	is	the	single	most	important	numerical	test.
TEST	18	—	Payrun	Warnings
Before	validation,	intentionally	create	a	problematic	employee.
For	example:
Missing	bank	details
Run	payroll.
## Expected:
## ⚠	MISSING_BANK_DETAILS
Also	inspect:
Duplicate	payslip
Unapproved	leave
Missing	contract
The	brief	explicitly	requires	warnings	before	finalization.
TEST	19	—	Payrun	State	Machine
Test	the	buttons	in	order:
## Compute
## Validate
## Mark	Paid
## Expected:
## DRAFT
## ↓
## COMPUTED
## ↓
## VALIDATED
## ↓
## PAID
Now	deliberately	attempt	invalid	sequences.
For	example:
DRAFT	→	Paid
DRAFT	→	Validate
PAID	→	Compute
PAID	→	Validate
## Expected:
## ❌	Blocked
✅	Clear	error
TEST	20	—	Payslip

## Open:
## Payslips
## Verify:
## Employee
## Structure
## Payrun
## Period
## Worked	Days
## Basic
## Allowances
## Gross
## Deductions
## Net
## Status
The	requirements	explicitly	call	for	the	rule-by-rule	breakdown	of	these	values.
## Check:
Database/Payrun	total
## =
Payslip	total
## =
UI	displayed	total
TEST	21	—	Historical	Payslip
Create	a	payslip.
Then	change:
Salary	rule	name
Salary	rule	amount
Employee	department
## Contract
Open	the	old	payslip.
## Expected:
✅	Historical	payslip	remains	correct
Then	create/recompute	a	new	payroll.
## Expected:
✅	New	calculation	uses	current	configuration	where	appropriate
This	tests	one	of	the	most	important	real-world	payroll	concepts:	history	must	not	magically	change.
## TEST	22	—	PDF
From	payslip:
## Print	Payslip
## Expected:

✅	PDF	downloads/opens
✅	Valid	PDF
✅	Employee	correct
✅	Period	correct
✅	Salary	values	correct
✅	Breakdown	correct
The	brief	explicitly	requires	individual	payslip	PDF	generation.
Compare	the	PDF	manually	with	the	UI.
This	catches	a	lot	of	hidden	bugs.
TEST	23	—	Email
## From	Payrun:
## Send	Payslips
## Expected:
✅	Correct	employees	selected
✅	Correct	email	addresses
✅	Correct	PDF	attachments
✅	Success/failure	indication
✅	No	cross-employee	payslip
Bulk	email	from	the	Payrun	is	explicitly	part	of	the	required	flow.
TEST	24	—	Dashboard
Now	go	to:
## Reports	/	Dashboard
Record	values	before	payroll.
## Then:
create	attendance
approve	leave
create/compute	payroll
mark	paid
Refresh	dashboard.
## Expected:
✅	KPIs	update
✅	Payslip	count	changes
✅	Net	salary	changes
✅	Leave	metrics	change
✅	Attendance	metrics	change
✅	Department	payroll	changes
The	dashboard	is	supposed	to	use	live	data	generated	by	actual	HR/payroll	operations,	not	static	charts.
Test	filters:
## Period

## Department
Employee	type
## Expected:
✅	Numbers	change	correctly
✅	Charts	update
✅	No	stale	values
The	brief	specifically	calls	for	period/department/employee-type	filtering.
TEST	25	—	CSV	/	Reports
Go	to:
## Reports
Export	CSV.
Open	it.
## Check:
✅	File	downloads
✅	Headers	correct
✅	Employee	data	correct
✅	Salary	data	correct
✅	No	duplicate	rows
✅	No	broken	formatting
TEST	26	—	Employee	Self-Service
Now	log	in	as:
## EMPLOYEE
This	is	a	completely	separate	testing	path.
The	employee	should	see	only	their	operational	information.
## Verify:
✅	Own	profile
✅	Own	attendance
✅	Own	leave
✅	Own	balances
✅	Own	payslips
✅	Own	PDF
Try	navigating	manually	to:
## Employees
Contracts	administration
Salary	structures
## Payruns
## Reports
## Users
## Expected:

❌	Access	denied	/	hidden
The	role	definition	explicitly	limits	employees	to	their	own	information	and	attendance/time-off	creation,
with	no	HR/payroll	administration.
TEST	27	—	HR	Manager
Log	in	as:
## HR_MANAGER
Verify	access	to:
## Employees
## Attendance
## Contracts
## Schedules
## Time	Off
Verify	no	payroll	configuration	access.
This	matches	the	specified	HR	Manager	permissions.
TEST	28	—	HR	Payroll	User
Log	in	as:
## HR_PAYROLL_USER
## Test:
## Employees	✅
## Attendance	✅
## Contracts	✅
## Time	Off	✅
## Payruns	✅
## Payslips	✅
Salary	Structures	READ	✅
Salary	Rules	READ	✅
Salary	Rule	EDIT	❌
Compare	against	the	role	specification.
TEST	29	—	HR	Payroll	Manager
Log	in	as:
## HR_PAYROLL_MANAGER
## Verify:
✅	HR	operations
## ✅	Payruns
## ✅	Payslips
✅	Salary	structures

✅	Salary	rules
✅	Payroll	configuration
The	role	is	intended	to	have	full	CRUD	over	payroll	configuration	and	operations.
TEST	30	—	Admin
## Finally:
## ADMIN
Verify	everything	works.
Also	test:
Create	user
Change	role
Deactivate	user
Change	configuration
Admin	should	have	full	access	according	to	the	brief.
## THE	MOST	IMPORTANT	TEST:	COMPLETE	BUSINESS	FLOW
After	all	individual	tests	pass,	do	one	uninterrupted	end-to-end	run.
This	is	what	I	would	actually	show	a	judge.
## Scenario	A	—	Employee	→	Payslip
## Login
## ↓
## Employees
## ↓
Open	employee
## ↓
## Check	Contract
## ↓
## Check	Working	Schedule
## ↓
## Create/verify	Attendance
## ↓
## Create/approve	Time	Off
## ↓
## Salary	Structure
## ↓
## Salary	Rules
## ↓
## Create	Payrun
## ↓
## Select	Employee
## ↓
## Compute
## ↓
## Review	Warning
## ↓
## Validate
## ↓
## Mark	Paid
## ↓
## Open	Payslip
## ↓
Generate	PDF

## ↓
## Send	Email
## ↓
## Dashboard
Every	arrow	must	actually	work.
This	directly	follows	the	problem’s	required	complete	flow.
SCENARIO	B	—	Leave	Flow
Then	do	the	second	official-style	scenario:
## Create	Time	Off	Type
## ↓
## Create	Allocation
## ↓
Employee	requests	leave
## ↓
Manager	opens	request
## ↓
## Approve
## ↓
Balance	decreases
## ↓
Dashboard	updates
## ↓
Payroll	reflects	approved	leave
That	matches	the	brief’s	proposed	second	demonstration	scenario.
## FINAL	“BREAK	THE	SYSTEM”	PASS
Once	normal	flows	work,	deliberately	try	to	break	it.
## Try:
❌	Invalid	dates
❌	Negative	salary
❌	1000%	salary	rule
❌	Invalid	formula
❌	Duplicate	contract
❌	Overlapping	contract
❌	Duplicate	attendance
❌	Invalid	checkout
❌	Excess	leave
❌	Approve	own	leave
❌	Access	another	employee’s	payslip
❌	Employee	access	to	payroll
❌	HR	Manager	access	to	salary	configuration
❌	Invalid	payrun	transition
❌	Duplicate	compute
❌	Refresh	during	loading
## ❌	Double-click	Save
## ❌	Double-click	Approve
## ❌	Double-click	Compute
❌	API/backend	restart	during	operation
For	each,	the	expected	result	is	generally:
❌	Operation	rejected	safely

✅	Data	remains	consistent
✅	User	gets	understandable	error
✅	No	blank/broken	page
✅	No	raw	backend/Prisma	error
What	I	would	prioritize	tonight
Don’t	necessarily	do	200	tiny	tests.	Do	these	12	critical	manual	scenarios	first:
#TestPriority
1Login/logout/session
2Employee	CRUD	+	related	records
3Contract	+	overlap
4Attendance	→	payroll
5Leave	allocation	→	approval	→	balance
6Salary	rule	calculation
7Payrun	wizard	→	Compute
8Compute	→	Validate	→	Paid
9Payslip	numbers	vs	expected	numbers
10PDF	+	Email
11Dashboard	updates	from	actual	actions
12All	5	role	permissions
Your	problem	statement	explicitly	says	the	priority	is	business	logic,	data	relationships,	payroll	calculation
and	end-to-end	UX,	rather	than	just	individual	CRUD	screens.
So	the	ultimate	question	while	testing	should	always	be:
“Did	this	action	correctly	change	the	rest	of	the	system?”
For	example:
## Approve	Leave
## ↓
Allocation	changes
## ↓
Employee	balance	changes
## ↓
Payroll	input	changes
## ↓
Payslip	changes
## ↓
Dashboard	changes