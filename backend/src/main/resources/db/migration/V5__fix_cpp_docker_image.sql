-- Fix C++ sandbox image: gcc:13-alpine does not exist; use local devopssuite-cpp image
UPDATE languages SET docker_image = 'devopssuite-cpp:latest', version = 'g++15' WHERE name = 'cpp';
