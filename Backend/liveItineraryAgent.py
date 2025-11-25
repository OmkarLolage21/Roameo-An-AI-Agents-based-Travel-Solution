from phi.agent import Agent
from phi.model.groq import Groq
from phi.utils.pprint import pprint_run_response
from phi.tools.duckduckgo import DuckDuckGo
from phi.tools.calculator import Calculator
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import json

load_dotenv()

class LiveItineraryAgent:
    """Agent for real-time itinerary adjustments based on mood and dynamic factors"""
    
    def __init__(self):
        api_key_groq = os.getenv("GROQ_API_KEY")
        self.agent = Agent(
            model=Groq(
                id="llama-3.3-70b-versatile",
                api_key=api_key_groq,
                max_tokens=8000
            ),
            markdown=True,
            tools=[
                DuckDuckGo(),
                Calculator(
                    add=True,
                    subtract=True,
                    multiply=True,
                    divide=True,
                )
            ],
            description="""You are an intelligent live itinerary manager that can dynamically adjust travel plans 
            based on real-time mood, energy levels, weather, and other factors.""",
            instructions=[
                """Your role is to instantly re-route and optimize itineraries when users report their current state:
                
                1. **Analyze Current Mood/State**: Understand if the group is tired, energetic, hungry, or facing other issues
                2. **Evaluate Current Itinerary**: Review what's planned for the rest of the day
                3. **Smart Replacement**: Find suitable alternatives that match their current state:
                   - Tired → Spa, cafe, light activities, shorter distances
                   - Energetic → Adventure activities, longer tours, hiking
                   - Hungry → Nearby restaurants with good ratings
                   - Weather issues → Indoor alternatives
                4. **Optimize Logistics**: 
                   - Cancel unsuitable activities
                   - Find available slots at alternative venues
                   - Re-route to minimize travel time
                   - Adjust remaining schedule to accommodate changes
                5. **Preserve Value**: Ensure the day remains enjoyable and isn't wasted
                
                Always search for:
                - Current availability of suggested venues
                - Real-time ratings and reviews
                - Distance from current location
                - Operating hours
                - Booking requirements
                
                Provide specific, actionable recommendations with booking links when possible.
                """,
            ],
            show_tool_calls=True,
            add_datetime_to_instructions=True,
        )
        self.context = {}
    
    def adjust_itinerary(self, current_itinerary, mood_state, current_time, current_location):
        """
        Dynamically adjust itinerary based on mood and current situation
        
        Args:
            current_itinerary: Dict containing today's planned activities
            mood_state: String describing current mood/state (e.g., "tired", "energetic", "hungry")
            current_time: Current time (e.g., "10:00 AM")
            current_location: Current location coordinates or name
        
        Returns:
            Adjusted itinerary with replacements and optimizations
        """
        query = f"""
        CURRENT SITUATION:
        - Time: {current_time}
        - Location: {current_location}
        - Group Mood/State: {mood_state}
        
        CURRENT ITINERARY FOR TODAY:
        {json.dumps(current_itinerary, indent=2)}
        
        TASK: The group has reported they are "{mood_state}" at {current_time}. Please:
        
        1. Identify which activities should be CANCELED or MODIFIED based on this mood
        2. Search for and suggest ALTERNATIVE activities that better match their current state
        3. Find available slots and booking options for alternatives
        4. Re-optimize the remaining schedule to:
           - Reduce travel time if tired
           - Add more engaging activities if energetic
           - Prioritize food if hungry
           - Move indoor if weather is bad
        5. Provide specific venue names, addresses, and booking links
        
        Format your response as:
        ## 🚫 Activities to Cancel/Modify
        [List with reasons]
        
        ## ✨ Recommended Alternatives
        [Specific venues with details, availability, and booking info]
        
        ## 📅 Updated Schedule
        [Revised timeline for rest of day]
        
        ## 💰 Cost Impact
        [Any cost changes or savings]
        """
        
        response = self.agent.run(query, stream=False)
        
        # Extract the content from the response
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Parse the response to extract structured data
        result = {
            "activities_to_cancel": [],
            "alternative_activities": [],
            "updated_schedule": [],
            "estimated_cost_impact": "",
            "reasoning": content,
            "summary": ""  # Add a brief summary field
        }
        
        # Try to extract structured information from the response
        lines = content.split('\n')
        current_section = None
        current_alternative = {}
        
        for line in lines:
            line_stripped = line.strip()
            if '🚫 Activities to Cancel' in line or 'Activities to Cancel' in line:
                current_section = 'cancel'
            elif '✨ Recommended Alternatives' in line or 'Recommended Alternatives' in line:
                current_section = 'alternatives'
            elif '📅 Updated Schedule' in line or 'Updated Schedule' in line:
                current_section = 'schedule'
            elif '💰 Cost Impact' in line or 'Cost Impact' in line:
                current_section = 'cost'
            elif line_stripped.startswith('•') or line_stripped.startswith('-'):
                if current_section == 'cancel':
                    cancel_text = line_stripped.lstrip('•-').strip()
                    # Extract activity name before the colon
                    if ':' in cancel_text:
                        activity_name = cancel_text.split(':')[0].strip()
                        result["activities_to_cancel"].append(activity_name)
                    else:
                        result["activities_to_cancel"].append(cancel_text)
                        
                elif current_section == 'alternatives':
                    venue_info = line_stripped.lstrip('•-').strip()
                    
                    # Check if this is a main alternative activity (has colon or is first line)
                    if not venue_info.startswith('Recommended Venue') and not venue_info.startswith('Booking Link') and not venue_info.startswith('Availability'):
                        if ':' in venue_info and not venue_info.startswith(' '):
                            # Save previous alternative if exists
                            if current_alternative and current_alternative.get('name'):
                                result["alternative_activities"].append(current_alternative)
                            
                            # Start new alternative
                            parts = venue_info.split(':', 1)
                            current_alternative = {
                                "name": parts[0].strip(),
                                "location": "To be determined",
                                "reason": parts[1].strip() if len(parts) > 1 else venue_info,
                                "estimated_time": "Flexible"
                            }
                    elif 'Recommended Venue:' in venue_info:
                        # Extract venue location
                        venue_text = venue_info.split('Recommended Venue:', 1)[1].strip()
                        if current_alternative:
                            current_alternative['location'] = venue_text
                            
                elif current_section == 'schedule':
                    schedule_text = line_stripped.lstrip('•-').strip()
                    # Parse schedule entries like "20:00 - 21:30: Activity Name"
                    if ':' in schedule_text:
                        parts = schedule_text.split(':', 1)
                        time_part = parts[0].strip()
                        name_part = parts[1].strip() if len(parts) > 1 else schedule_text
                        
                        result["updated_schedule"].append({
                            "time": time_part,
                            "name": name_part,
                            "location": "See details",
                            "status": "upcoming"
                        })
                        
            elif current_section == 'cost' and line_stripped:
                result["estimated_cost_impact"] += line_stripped + " "
        
        # Add last alternative if exists
        if current_alternative and current_alternative.get('name'):
            result["alternative_activities"].append(current_alternative)
        
        # Generate a concise summary
        cancel_count = len(result["activities_to_cancel"])
        alt_count = len(result["alternative_activities"])
        result["summary"] = f"Cancelled {cancel_count} activities and suggested {alt_count} alternatives based on {mood_state} mood."
        
        return result
    
    def find_nearby_alternatives(self, activity_type, location, radius_km, mood_state):
        """
        Find nearby alternatives based on activity type and mood
        
        Args:
            activity_type: Type of activity to replace (e.g., "hiking", "museum")
            location: Current location
            radius_km: Search radius in kilometers
            mood_state: Current mood state
        
        Returns:
            List of alternative suggestions
        """
        query = f"""
        Find alternative activities near {location} within {radius_km}km that match the mood: {mood_state}
        
        Original activity type: {activity_type}
        
        Search for:
        1. Venues currently open
        2. Activities suitable for "{mood_state}" mood
        3. Real-time availability
        4. Distance and travel time from {location}
        5. Ratings and reviews
        6. Price range
        7. Booking requirements
        
        Provide at least 3-5 alternatives with complete details.
        """
        
        response = self.agent.run(query, stream=False)
        content = response.content if hasattr(response, 'content') else str(response)
        
        return {"alternatives": content}
    
    def optimize_remaining_schedule(self, remaining_activities, current_location, mood_state, time_available):
        """
        Optimize the remaining activities based on current situation
        
        Args:
            remaining_activities: List of activities still planned
            current_location: Current location
            mood_state: Current mood state
            time_available: Time remaining in the day
        
        Returns:
            Optimized schedule
        """
        query = f"""
        CURRENT SITUATION:
        - Location: {current_location}
        - Mood: {mood_state}
        - Time Available: {time_available}
        
        REMAINING PLANNED ACTIVITIES:
        {json.dumps(remaining_activities, indent=2)}
        
        TASK: Optimize the remaining schedule considering:
        1. Current mood and energy level
        2. Travel time between locations
        3. Operating hours of venues
        4. Logical flow of activities
        5. Breaks and rest time if needed
        
        Provide:
        - Reordered activities with optimal timing
        - Suggested break times
        - Alternative venues if originals are too far or closed
        - Total travel time and distances
        """
        
        response = self.agent.run(query, stream=False)
        content = response.content if hasattr(response, 'content') else str(response)
        
        return {"optimized_schedule": content}
    
    def emergency_reroute(self, current_situation, destination, urgency_level):
        """
        Handle emergency situations requiring immediate re-routing
        
        Args:
            current_situation: Description of emergency (weather, illness, etc.)
            destination: Original destination
            urgency_level: "high", "medium", "low"
        
        Returns:
            Emergency alternative plan
        """
        query = f"""
        EMERGENCY SITUATION:
        {current_situation}
        
        Original Destination: {destination}
        Urgency Level: {urgency_level}
        
        Provide immediate alternatives:
        1. Closest safe/suitable venues
        2. Indoor alternatives if weather-related
        3. Medical facilities if health-related
        4. Quick booking options
        5. Emergency contacts if needed
        
        Prioritize safety and comfort.
        """
        
        response = self.agent.run(query, stream=False)
        content = response.content if hasattr(response, 'content') else str(response)
        
        return {"emergency_plan": content}

# Example usage
if __name__ == "__main__":
    agent = LiveItineraryAgent()
    
    # Example: Group is tired at 10 AM
    current_itinerary = {
        "date": "2025-11-25",
        "activities": [
            {
                "time": "09:00 AM - 12:00 PM",
                "activity": "Mountain Hiking",
                "location": "Blue Ridge Trail",
                "status": "in-progress"
            },
            {
                "time": "01:00 PM - 03:00 PM",
                "activity": "Lunch at Mountain View Restaurant",
                "location": "Blue Ridge Peak",
                "status": "planned"
            },
            {
                "time": "04:00 PM - 07:00 PM",
                "activity": "City Museum Tour",
                "location": "Downtown Museum District",
                "status": "planned"
            },
            {
                "time": "08:00 PM - 10:00 PM",
                "activity": "Dinner at Sunset Grill",
                "location": "Harbor District",
                "status": "planned"
            }
        ]
    }
    
    agent.adjust_itinerary(
        current_itinerary=current_itinerary,
        mood_state="tired and need rest",
        current_time="10:00 AM",
        current_location="Blue Ridge Trail starting point"
    )
