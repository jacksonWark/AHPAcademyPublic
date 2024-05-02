AHPAcademyPublic is the publicly viewable repository for the codebase behind ahpbaseball.com.

Absolute Human Performance (AHP) - a high-performance training facility in St Albert, AB, Canada - asked 
me to build a custom website for their baseball academy and travel program. This started with a landing
page and rosters and schedules for one team in 2021. This expanded to several teams at different age groups,
alumni, advertising brochures, facility information, and a contact form. 

I started with a responsive template with modified styles and JavaScript and manually configured AWS infrastructure.
This was replaced by a Pulumi IaC solution to simplify the workflow for updating and maintaining AWS infrastructure
as I added two Lambda functions, an API Gateway API to manage them, as well as the S3 bucket and Cloudfront distribution. 

This project was intended as a lightweight and cost efficient deployment that could meet the needs of AHP 
while still looking custom and professional - an impression that AHP makes in other parts of their business. 
It served as experience in web technologies, cloud infrastructure and IaC. 

The all the contents of the "www" directory are deployed to an S3 bucket and served through Cloudfront.
The "pulumi" directory contains the deployment script that provisons all the AWS infrastructure,
as well as the Lambda functions and configuration files. 

Included below is the Readme provided with the template that was used to start off this project. 

---------------

TXT by HTML5 UP
html5up.net | @ajlkn
Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)


A new, fully responsive portfolio/business style website template. I've been experimenting
with minimalist styles lately and this design is one of many in the works that exemplifies
this new direction. Hope you enjoy it.

Demo images* courtesy of Unsplash, a radtastic collection of CC0 (public domain) images
you can use for pretty much whatever.

(* = Not included)

Feedback, bug reports, and comments are not only welcome, but strongly encouraged :)

AJ
aj@lkn.io | @ajlkn


Credits:

	Demo Images:
		Unsplash (unsplash.com)

	Icons:
		Font Awesome (fontawesome.io)

	Other:
		jQuery (jquery.com)
		Responsive Tools (github.com/ajlkn/responsive-tools)