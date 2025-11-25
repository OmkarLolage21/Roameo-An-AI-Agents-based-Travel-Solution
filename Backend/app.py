from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import uuid
from datetime import datetime
import re

# Import from the travel agent modules
from geolocation import InteractiveTravelAgent, get_location_coordinates
from bookingAgent import TravelOptionsFinder
from liveItineraryAgent import LiveItineraryAgent

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Sessions storage
sessions = {}

def create_new_session():
    """Create a new session with initialized agents"""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "travel_agent": InteractiveTravelAgent(),
        "booking_agent": TravelOptionsFinder(),
        "live_itinerary_agent": LiveItineraryAgent(),
        "chat_history": [],
        "created_at": datetime.now().isoformat(),
        "last_active": datetime.now().isoformat(),
        "current_itinerary": None,
        "current_location": None
    }
    return session_id

def get_session(session_id):
    """Get session by ID or return None if not found"""
    return sessions.get(session_id)

def update_session_activity(session_id):
    """Update the last active timestamp for a session"""
    if session_id in sessions:
        sessions[session_id]["last_active"] = datetime.now().isoformat()

def add_to_chat_history(session_id, source, message, response=None):
    """Add a message to the chat history"""
    if session_id in sessions:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "source": source,
            "message": message
        }
        if response:
            entry["response"] = response
        
        sessions[session_id]["chat_history"].append(entry)

def process_function_calls(text):
    """
    Process all function calls in the text and replace them with their results
    The format is expected to be <function=get_location_coordinates{"location_name": "Location Name"}></function>
    or get_location_coordinates("Location Name")
    """
    # Process format: <function=get_location_coordinates{"location_name": "Location Name"}></function>
    function_pattern = r'<function=get_location_coordinates\{\"location_name\"\s*:\s*\"([^\"]+)\"\}\}</function>'
    matches = re.findall(function_pattern, text)
    
    for location_name in matches:
        result = get_location_coordinates(location_name)
        text = text.replace(f'<function=get_location_coordinates{{"location_name": "{location_name}"}}</function>', 
                           f'**Coordinates**: {result}')
    
    # Process format: get_location_coordinates("Location Name")
    function_pattern2 = r'get_location_coordinates\(\"([^\"]+)\"\)'
    matches = re.findall(function_pattern2, text)
    
    for location_name in matches:
        result = get_location_coordinates(location_name)
        text = text.replace(f'get_location_coordinates("{location_name}")', 
                           f'**Coordinates**: {result}')
    
    # Handle any function waiting patterns
    waiting_patterns = [
        r'(Waiting for the result of the function call.*?\n)',
        r'(Please wait for the function result.*?\n)',
        r'(Once I have the coordinates.*?\n)',
        r'(\(Please provide the result of the function call\))'
    ]
    
    for pattern in waiting_patterns:
        text = re.sub(pattern, '', text)
    
    return text

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "message": "Travel API is running"}), 200

@app.route('/sessions', methods=['POST'])
def create_session():
    """Create a new session and return its ID"""
    session_id = create_new_session()
    return jsonify({
        "session_id": session_id,
        "message": "New session created successfully"
    }), 201

@app.route('/sessions/<session_id>', methods=['GET'])
def get_session_info(session_id):
    """Get session information and chat history"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    # Clean the session data to make it serializable
    return jsonify({
        "session_id": session_id,
        "created_at": session["created_at"],
        "last_active": session["last_active"],
        "chat_history": session["chat_history"],
        "travel_agent_context": session["travel_agent"].context,
        "booking_agent_context": session["booking_agent"].context
    }), 200

@app.route('/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    del sessions[session_id]
    return jsonify({"message": "Session deleted successfully"}), 200

@app.route('/sessions', methods=['GET'])
def list_sessions():
    """List all active sessions"""
    session_list = [{
        "session_id": sid,
        "created_at": data["created_at"],
        "last_active": data["last_active"],
        "message_count": len(data["chat_history"])
    } for sid, data in sessions.items()]
    
    return jsonify({"sessions": session_list}), 200

@app.route('/sessions/<session_id>/coordinates', methods=['POST'])
def get_coordinates(session_id):
    """Get coordinates for a location name"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'location' not in data:
        return jsonify({"error": "Location name is required"}), 400
    
    location_name = data['location']
    add_to_chat_history(session_id, "user", f"Get coordinates for: {location_name}")
    
    # Pass location_name as a string directly to match geolocation.py implementation
    coordinates = get_location_coordinates(location_name)
    
    add_to_chat_history(session_id, "system", f"Returning coordinates", coordinates)
    update_session_activity(session_id)
    
    return jsonify({"result": coordinates}), 200

@app.route('/sessions/<session_id>/suggest-places', methods=['POST'])
def suggest_places(session_id):
    """Suggest places to visit based on destination and duration"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'destination' not in data or 'duration' not in data:
        return jsonify({"error": "Destination and duration are required"}), 400
    
    travel_agent = session["travel_agent"]
    destination = data['destination']
    duration = data['duration']
    
    add_to_chat_history(session_id, "user", f"Suggest places in {destination} for {duration}")
    
    # Store the data in the agent's context
    travel_agent.context["destination"] = destination
    travel_agent.context["duration"] = duration
    
    query = f"""Suggest top attractions and places to visit in {destination} for a {duration} trip.

For each attraction you suggest:
1. Provide a brief description
2. Include the full name and location details
3. Number each suggestion for easy reference (at least 5-7 attractions)

IMPORTANT: DO NOT try to use any functions or tools in your response. Just list the attractions with descriptions.
I will automatically get coordinates for all locations after receiving your response."""
    
    response = travel_agent.agent.run(query)
    
    # Process the response to replace any function calls with actual results
    processed_response = process_function_calls(response.content)
    
    # Extract attraction names using regex - looking for numbered items with attraction names
    attraction_pattern = r'\d+\.\s+\*\*([^*:]+)(?:\*\*|:)'
    attractions = re.findall(attraction_pattern, processed_response)
    
    # Create a list to store attractions with coordinates
    attractions_with_coords = []
    
    for attraction in attractions:
        # Clean up the attraction name by removing any trailing asterisks and extra spaces
        attraction_name = attraction.strip()
        
        # Only add the destination if it's not already included in the attraction name
        if destination.lower() not in attraction_name.lower():
            location_query = f"{attraction_name}, {destination}"
        else:
            location_query = attraction_name
            
        # Call get_coordinates function directly
        coords_result = get_location_coordinates(location_query)
        
        # Add to our list
        attractions_with_coords.append({
            "name": attraction_name,
            "location_query": location_query,
            "coordinates": coords_result
        })
        
        # Add coordinates after the attraction's description paragraph in the response
        attraction_end = processed_response.find("\n\n", processed_response.find(attraction))
        if attraction_end == -1:  # If we can't find a double newline, find the next numbered item
            next_match = re.search(r'\d+\.\s+\*\*', processed_response[processed_response.find(attraction)+len(attraction):])
            if next_match:
                attraction_end = processed_response.find(attraction) + len(attraction) + next_match.start()
            else:
                attraction_end = len(processed_response)
        
        processed_response = processed_response[:attraction_end] + f"\n**Coordinates**: {coords_result}" + processed_response[attraction_end:]
    
    add_to_chat_history(session_id, "system", "Places suggestions", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "suggestions": processed_response,
        "destination": destination,
        "duration": duration,
        "attractions_with_coordinates": attractions_with_coords
    }), 200

@app.route('/sessions/<session_id>/select-places', methods=['POST'])
def select_places(session_id):
    """Store user-selected places in context"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'selected_places' not in data:
        return jsonify({"error": "Selected places are required"}), 400
    
    travel_agent = session["travel_agent"]
    selected_places = data['selected_places']
    
    add_to_chat_history(session_id, "user", f"Selected places: {selected_places}")
    travel_agent.context["selected_places"] = selected_places
    update_session_activity(session_id)
    
    return jsonify({
        "message": "Places selected successfully",
        "selected_places": selected_places
    }), 200

@app.route('/sessions/<session_id>/suggest-accommodations', methods=['POST'])
def suggest_accommodations(session_id):
    """Suggest accommodations based on selected places"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    travel_agent = session["travel_agent"]
    
    # Check if required context is available
    if "destination" not in travel_agent.context or "selected_places" not in travel_agent.context:
        return jsonify({"error": "Destination and selected places are required. Call /suggest-places and /select-places first"}), 400
    
    add_to_chat_history(session_id, "user", "Request for accommodation suggestions")
    
    selected_places = travel_agent.context.get("selected_places", "")
    destination = travel_agent.context.get("destination", "")
    
    query = f"""Based on the user's interest in places {selected_places} in {destination}, suggest accommodation options in different budget ranges (budget, mid-range, luxury) that are conveniently located near these attractions.
    
    For each accommodation:
    1. Provide name, description and approximate price range
    2. Mention its proximity to selected attractions
    3. Number each suggestion for easy reference (at least 3 options in different price ranges)
    
    IMPORTANT: DO NOT try to use any functions or tools in your response. Just list the accommodations with descriptions.
    I will automatically get coordinates for all locations after receiving your response."""
    
    response = travel_agent.agent.run(query)
    
    # Process the response to replace any function calls with actual results
    processed_response = process_function_calls(response.content)
    
    # Post-process to add coordinates to each accommodation
    # Extract hotel names using regex
    hotel_pattern = r'\d+\.\s+\*\*([^:]+)(?:\*\*|:)'
    hotels = re.findall(hotel_pattern, processed_response)
    
    for hotel in hotels:
        # If coordinates for this hotel aren't already in the response
        if f"{hotel}, {destination}" not in processed_response:
            coords = get_location_coordinates(f"{hotel}, {destination}")
            # Add coordinates after the hotel's description paragraph
            hotel_end = processed_response.find("\n\n", processed_response.find(hotel))
            if hotel_end == -1:  # If we can't find a double newline, find the next numbered item
                next_match = re.search(r'\d+\.\s+\*\*', processed_response[processed_response.find(hotel)+len(hotel):])
                if next_match:
                    hotel_end = processed_response.find(hotel) + len(hotel) + next_match.start()
                else:
                    hotel_end = len(processed_response)
            
            processed_response = processed_response[:hotel_end] + f"\n**Coordinates**: {coords}" + processed_response[hotel_end:]
    
    add_to_chat_history(session_id, "system", "Accommodation suggestions", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "accommodations": processed_response
    }), 200

@app.route('/sessions/<session_id>/select-accommodation', methods=['POST'])
def select_accommodation(session_id):
    """Store user-selected accommodation in context"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'selected_hotel' not in data:
        return jsonify({"error": "Selected hotel is required"}), 400
    
    travel_agent = session["travel_agent"]
    selected_hotel = data['selected_hotel']
    
    add_to_chat_history(session_id, "user", f"Selected accommodation: {selected_hotel}")
    travel_agent.context["selected_hotel"] = selected_hotel
    update_session_activity(session_id)
    
    return jsonify({
        "message": "Accommodation selected successfully",
        "selected_hotel": selected_hotel
    }), 200

@app.route('/sessions/<session_id>/create-itinerary', methods=['POST'])
def create_itinerary(session_id):
    """Create a detailed itinerary based on all selections"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    travel_agent = session["travel_agent"]
    
    # Check if required context is available
    required_keys = ["destination", "duration", "selected_places", "selected_hotel"]
    missing_keys = [key for key in required_keys if key not in travel_agent.context]
    
    if missing_keys:
        return jsonify({
            "error": f"Missing required information: {', '.join(missing_keys)}. Complete previous steps first."
        }), 400
    
    add_to_chat_history(session_id, "user", "Request to create itinerary")
    
    destination = travel_agent.context.get("destination", "")
    duration = travel_agent.context.get("duration", "")
    selected_places = travel_agent.context.get("selected_places", "")
    selected_hotel = travel_agent.context.get("selected_hotel", "")
    
    query = f"""Create a detailed {duration} itinerary for {destination} including:
    1. Day-by-day schedule visiting the places numbered {selected_places} that the user selected
    2. Accommodation at hotel option {selected_hotel}
    3. Transportation recommendations between attractions
    4. Meal suggestions including local cuisine
    5. Estimated budget breakdown for the entire trip
    
    IMPORTANT: DO NOT try to use any functions or tools in your response. Just create the itinerary.
    I will automatically add coordinates to the itinerary later.
    
    Organize by day and include estimated times for activities."""
    
    response = travel_agent.agent.run(query)
    
    # Process the response to replace any function calls with actual results
    processed_response = process_function_calls(response.content)
    
    add_to_chat_history(session_id, "system", "Generated itinerary", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "itinerary": processed_response
    }), 200

@app.route('/sessions/<session_id>/find-transportation-options', methods=['POST'])
def find_transportation_options(session_id):
    """Find transportation options between destinations"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'itinerary' not in data:
        return jsonify({"error": "Itinerary is required"}), 400
    
    booking_agent = session["booking_agent"]
    itinerary = data['itinerary']
    
    add_to_chat_history(session_id, "user", "Request for transportation options")
    booking_agent.context["itinerary"] = itinerary
    
    query = f"""Based on the following itinerary, search for and recommend the best transportation options (flights, trains, buses, etc.) between each destination:
    {itinerary}
    
    For each leg of the journey:
    1. Search for available transportation options (flight routes, train services, bus lines)
    2. Find the websites where these can be booked
    3. Include approximate costs, duration, and schedule information
    4. Highlight the most convenient or cost-effective options
    
    Format your response by journey leg (e.g., "City A to City B") and include direct links to booking websites."""
    
    response = booking_agent.agent.run(query)
    
    # Process any function calls that might be in the response
    processed_response = process_function_calls(response.content)
    
    add_to_chat_history(session_id, "system", "Transportation options", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "transportation_options": processed_response
    }), 200

@app.route('/sessions/<session_id>/find-accommodation-options', methods=['POST'])
def find_accommodation_options(session_id):
    """Find accommodation options for each destination"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    booking_agent = session["booking_agent"]
    
    if "itinerary" not in booking_agent.context:
        return jsonify({"error": "Itinerary is required. Call /find-transportation-options first"}), 400
    
    add_to_chat_history(session_id, "user", "Request for accommodation booking options")
    
    itinerary = booking_agent.context.get("itinerary", "")
    
    query = f"""Based on the following itinerary, search for and recommend accommodation options at each destination:
    {itinerary}
    
    For each destination where the traveler will stay overnight:
    1. Search for hotel options in different price ranges (budget, mid-range, luxury)
    2. Find the official websites or booking platforms where these accommodations can be reserved
    3. Include approximate nightly rates, key amenities, and location advantages
    4. Note any special deals or promotions currently available
    
    Format your response by destination and include direct links to booking websites for each recommended accommodation."""
    
    response = booking_agent.agent.run(query)
    
    # Process any function calls that might be in the response
    processed_response = process_function_calls(response.content)
    
    add_to_chat_history(session_id, "system", "Accommodation booking options", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "accommodation_options": processed_response
    }), 200

@app.route('/sessions/<session_id>/find-local-transportation', methods=['POST'])
def find_local_transportation(session_id):
    """Find local transportation options within each destination"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    booking_agent = session["booking_agent"]
    
    if "itinerary" not in booking_agent.context:
        return jsonify({"error": "Itinerary is required. Call /find-transportation-options first"}), 400
    
    add_to_chat_history(session_id, "user", "Request for local transportation options")
    
    itinerary = booking_agent.context.get("itinerary", "")
    
    query = f"""Based on the following itinerary, search for and recommend local transportation options within each destination:
    {itinerary}
    
    For each destination:
    1. Search for public transportation options (metro, bus, tram, etc.)
    2. Find information about ride-sharing services or taxis
    3. Look for any transportation passes or cards that might save money
    4. Include websites where tickets or passes can be purchased in advance
    5. Mention transportation options between key attractions mentioned in the itinerary
    
    Format your response by destination and include direct links to official transportation websites or apps."""
    
    response = booking_agent.agent.run(query)
    
    # Process any function calls that might be in the response
    processed_response = process_function_calls(response.content)
    
    add_to_chat_history(session_id, "system", "Local transportation options", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "local_transportation": processed_response
    }), 200

@app.route('/sessions/<session_id>/create-comprehensive-plan', methods=['POST'])
def create_comprehensive_plan(session_id):
    """Create a comprehensive travel and booking plan"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    booking_agent = session["booking_agent"]
    
    if "itinerary" not in booking_agent.context:
        return jsonify({"error": "Itinerary is required. Call /find-transportation-options first"}), 400
    
    add_to_chat_history(session_id, "user", "Request for comprehensive travel plan")
    
    itinerary = booking_agent.context.get("itinerary", "")
    
    query = f"""Create a comprehensive travel and booking plan based on this itinerary:
    {itinerary}
    
    Include:
    1. A complete day-by-day breakdown with all transportation and accommodation recommendations
    2. Direct booking links for each recommended service
    3. A suggested booking timeline (which bookings should be made first)
    4. Estimated total budget for transportation and accommodations
    5. Tips for getting the best deals on the recommended services
    
    Format this as a complete travel booking guide that the traveler can follow step by step."""
    
    response = booking_agent.agent.run(query)
    
    # Process any function calls that might be in the response
    processed_response = process_function_calls(response.content)
    
    add_to_chat_history(session_id, "system", "Comprehensive travel plan", processed_response)
    update_session_activity(session_id)
    
    return jsonify({
        "comprehensive_plan": processed_response
    }), 200

@app.route('/sessions/<session_id>/reset', methods=['POST'])
def reset_session_context(session_id):
    """Reset the context for a specific session"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    # Reset the contexts but keep the chat history
    session["travel_agent"].context = {}
    session["booking_agent"].context = {}
    
    add_to_chat_history(session_id, "system", "Session context reset")
    update_session_activity(session_id)
    
    return jsonify({
        "message": "Session context reset successfully"
    }), 200

@app.route('/sessions/<session_id>/chat', methods=['POST'])
def add_chat_message(session_id):
    """Add a message to the chat history"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'message' not in data or 'source' not in data:
        return jsonify({"error": "Message and source are required"}), 400
    
    message = data['message']
    source = data['source']
    response = data.get('response', None)
    
    add_to_chat_history(session_id, source, message, response)
    update_session_activity(session_id)
    
    return jsonify({
        "message": "Chat message added successfully"
    }), 201

@app.route('/sessions/<session_id>/update-mood', methods=['POST'])
def update_mood(session_id):
    """Update current mood/state for live itinerary adjustments"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'mood_state' not in data:
        return jsonify({"error": "Mood state is required"}), 400
    
    mood_state = data['mood_state']
    current_time = data.get('current_time', datetime.now().strftime("%H:%M"))
    current_location = data.get('current_location', session.get('current_location', 'Current location'))
    
    # Update session with current state
    session['current_mood'] = mood_state
    session['current_time'] = current_time
    session['current_location'] = current_location
    
    add_to_chat_history(session_id, "user", f"Mood update: {mood_state} at {current_time}")
    update_session_activity(session_id)
    
    return jsonify({
        "message": "Mood state updated successfully",
        "mood_state": mood_state,
        "current_time": current_time,
        "current_location": current_location
    }), 200

@app.route('/sessions/<session_id>/adjust-itinerary', methods=['POST'])
def adjust_itinerary(session_id):
    """Dynamically adjust itinerary based on current mood and situation"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'current_itinerary' not in data or 'mood_state' not in data:
        return jsonify({"error": "Current itinerary and mood state are required"}), 400
    
    live_agent = session["live_itinerary_agent"]
    current_itinerary = data['current_itinerary']
    mood_state = data['mood_state']
    current_time = data.get('current_time', datetime.now().strftime("%H:%M"))
    current_location = data.get('current_location', session.get('current_location', 'Current location'))
    
    # Store current itinerary in session
    session['current_itinerary'] = current_itinerary
    
    add_to_chat_history(session_id, "user", f"Request to adjust itinerary based on mood: {mood_state}")
    
    # Call the live itinerary agent to adjust the schedule
    try:
        result = live_agent.adjust_itinerary(
            current_itinerary=current_itinerary,
            mood_state=mood_state,
            current_time=current_time,
            current_location=current_location
        )
        
        # Update session with the adjusted itinerary
        session['current_itinerary'] = result.get('updated_schedule', current_itinerary)
        
        add_to_chat_history(session_id, "system", "Itinerary adjusted", result)
        update_session_activity(session_id)
        
        return jsonify({
            "message": "Itinerary adjusted successfully",
            "result": result
        }), 200
        
    except Exception as e:
        add_to_chat_history(session_id, "system", f"Error adjusting itinerary: {str(e)}")
        return jsonify({
            "error": "Failed to adjust itinerary",
            "details": str(e)
        }), 500

@app.route('/sessions/<session_id>/find-alternatives', methods=['POST'])
def find_alternatives(session_id):
    """Find alternative venues near current location"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'activity_type' not in data:
        return jsonify({"error": "Activity type is required"}), 400
    
    live_agent = session["live_itinerary_agent"]
    activity_type = data['activity_type']
    location = data.get('location', session.get('current_location', 'Current location'))
    radius_km = data.get('radius_km', 5)
    mood_state = data.get('mood_state', session.get('current_mood', 'neutral'))
    
    add_to_chat_history(session_id, "user", f"Request alternatives for {activity_type} near {location}")
    
    try:
        alternatives = live_agent.find_nearby_alternatives(
            activity_type=activity_type,
            location=location,
            radius_km=radius_km,
            mood_state=mood_state
        )
        
        add_to_chat_history(session_id, "system", "Found alternatives", alternatives)
        update_session_activity(session_id)
        
        return jsonify({
            "message": "Alternatives found successfully",
            "alternatives": alternatives
        }), 200
        
    except Exception as e:
        add_to_chat_history(session_id, "system", f"Error finding alternatives: {str(e)}")
        return jsonify({
            "error": "Failed to find alternatives",
            "details": str(e)
        }), 500

@app.route('/sessions/<session_id>/emergency-reroute', methods=['POST'])
def emergency_reroute(session_id):
    """Handle emergency rerouting situations"""
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    if not data or 'current_situation' not in data or 'destination' not in data:
        return jsonify({"error": "Current situation and destination are required"}), 400
    
    live_agent = session["live_itinerary_agent"]
    current_situation = data['current_situation']
    destination = data['destination']
    urgency_level = data.get('urgency_level', 'high')
    
    add_to_chat_history(session_id, "user", f"Emergency reroute request: {current_situation}")
    
    try:
        reroute_plan = live_agent.emergency_reroute(
            current_situation=current_situation,
            destination=destination,
            urgency_level=urgency_level
        )
        
        add_to_chat_history(session_id, "system", "Emergency reroute plan", reroute_plan)
        update_session_activity(session_id)
        
        return jsonify({
            "message": "Emergency reroute completed",
            "reroute_plan": reroute_plan
        }), 200
        
    except Exception as e:
        add_to_chat_history(session_id, "system", f"Error with emergency reroute: {str(e)}")
        return jsonify({
            "error": "Failed to create emergency reroute",
            "details": str(e)
        }), 500

@app.route('/cleanup-sessions', methods=['POST'])
def cleanup_old_sessions():
    """Admin endpoint to clean up old sessions"""
    # Optional: Add authentication for this endpoint
    
    data = request.json
    hours = data.get('hours', 24) if data else 24
    
    # Calculate cutoff time
    cutoff = datetime.now()
    cutoff = cutoff.replace(hour=cutoff.hour - hours)
    
    # Find sessions older than cutoff
    old_sessions = []
    for session_id, session_data in list(sessions.items()):
        last_active = datetime.fromisoformat(session_data["last_active"])
        if last_active < cutoff:
            old_sessions.append(session_id)
            del sessions[session_id]
    
    return jsonify({
        "message": f"Cleaned up {len(old_sessions)} old sessions",
        "removed_sessions": old_sessions
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)