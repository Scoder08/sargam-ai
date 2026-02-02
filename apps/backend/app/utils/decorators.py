"""
Utility Decorators
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def premium_required(f):
    """
    Decorator to require premium subscription.
    
    Usage:
        @premium_required
        def premium_endpoint():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        is_premium = claims.get("isPremium", False)
        
        if not is_premium:
            return jsonify({
                "error": "Premium required",
                "message": "This feature requires a premium subscription"
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function
